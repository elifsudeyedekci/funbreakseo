import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { Keyword, Project, ProjectStatus, SubscriptionStatus } from '@prisma/client'
import axios from 'axios'
import { PrismaService } from '../../prisma.service'

type KeywordWithProject = Keyword & { project: Project }

interface DataForSeoSerpItem {
  type: string
  rank_absolute?: number
  domain?: string
  url?: string
}

interface DataForSeoSerpResponse {
  tasks?: Array<{
    result?: Array<{
      items?: DataForSeoSerpItem[]
    }>
  }>
}

interface RankCheckResult {
  position: number | null
  url: string | null
  serpFeatures: {
    ai_overview: boolean
    featured_snippet: boolean
    paa: boolean
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function normalizeDomain(raw: string): string {
  return raw
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .toLowerCase()
}

@Processor('rank-tracking')
@Injectable()
export class RankTrackingWorker extends WorkerHost {
  private readonly logger = new Logger(RankTrackingWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('rank-tracking') private readonly rankQueue: Queue,
  ) {
    super()
  }

  // -------------------------------------------------------------------------
  // Job router
  // -------------------------------------------------------------------------
  async process(job: Job<{ projectId?: string; keywordId?: string }>): Promise<void> {
    switch (job.name) {
      case 'check-all':
        if (!job.data.projectId) {
          this.logger.error(`check-all job missing projectId`)
          return
        }
        return this.handleCheckAll(job as Job<{ projectId: string }>)

      case 'check-single':
        if (!job.data.keywordId) {
          this.logger.error(`check-single job missing keywordId`)
          return
        }
        return this.handleCheckSingle(job as Job<{ keywordId: string }>)

      default:
        this.logger.warn(`Unknown job name: ${job.name}`)
    }
  }

  // -------------------------------------------------------------------------
  // Cron: every day at 2 AM — enqueue check-all for every active project
  // -------------------------------------------------------------------------
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyCrawl(): Promise<void> {
    this.logger.log('dailyCrawl triggered — enqueuing rank checks for all active projects')

    const projects = await this.prisma.project.findMany({
      where: {
        status: ProjectStatus.ACTIVE,
        organization: {
          subscription: {
            // Maliyet koruması: ödemesi geciken (PAST_DUE) ve askıdaki hesaplar
            // için API maliyeti üretme — sadece aktif/trial hesaplar taranır
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
            },
          },
        },
      },
      select: { id: true },
    })

    for (const project of projects) {
      await this.rankQueue.add('check-all', { projectId: project.id })
    }

    this.logger.log(`dailyCrawl — enqueued ${projects.length} projects`)
  }

  // -------------------------------------------------------------------------
  // Handle 'check-all' job: check every keyword for a project
  // -------------------------------------------------------------------------
  private async handleCheckAll(job: Job<{ projectId: string }>): Promise<void> {
    const { projectId } = job.data
    this.logger.log(`[Job ${job.id}] check-all for project=${projectId}`)

    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      include: { project: true },
    })

    this.logger.log(`[Job ${job.id}] Found ${keywords.length} keywords to check`)

    let consecutiveDfsFailures = 0
    for (const keyword of keywords) {
      try {
        await this.processKeyword(keyword as KeywordWithProject)
        consecutiveDfsFailures = 0
      } catch (err) {
        consecutiveDfsFailures++
        this.logger.warn(`[Job ${job.id}] Keyword "${(keyword as KeywordWithProject).phrase}" failed (consecutive failures: ${consecutiveDfsFailures}): ${(err as Error).message}`)
        // Circuit breaker: 3 consecutive DataForSEO failures → abort job so BullMQ retries after 30 min
        if (consecutiveDfsFailures >= 3) {
          throw new Error(`DataForSEO unavailable after ${consecutiveDfsFailures} consecutive failures — job will retry in 30 min`)
        }
      }
    }

    this.logger.log(`[Job ${job.id}] check-all complete for project=${projectId}`)
  }

  // -------------------------------------------------------------------------
  // Handle 'check-single' job: check one keyword by ID
  // -------------------------------------------------------------------------
  private async handleCheckSingle(job: Job<{ keywordId: string }>): Promise<void> {
    const { keywordId } = job.data
    this.logger.log(`[Job ${job.id}] check-single for keyword=${keywordId}`)

    const keyword = await this.prisma.keyword.findUnique({
      where: { id: keywordId },
      include: { project: true },
    })

    if (!keyword) {
      this.logger.error(`Keyword ${keywordId} not found`)
      return
    }

    await this.processKeyword(keyword as KeywordWithProject)
    this.logger.log(`[Job ${job.id}] check-single complete for keyword=${keywordId}`)
  }

  // -------------------------------------------------------------------------
  // Core: check one keyword and persist results + notifications
  // -------------------------------------------------------------------------
  private async processKeyword(keyword: KeywordWithProject): Promise<void> {
    // Get previous rank before creating a new one
    const previousRank = await this.prisma.keywordRank.findFirst({
      where: { keywordId: keyword.id },
      orderBy: { checkedAt: 'desc' },
    })
    const previousPosition = previousRank?.position ?? null

    // checkKeywordRank throws if all retries are exhausted (DataForSEO down).
    const result = await this.checkKeywordRank(keyword)

    // Persist new rank
    await this.prisma.keywordRank.create({
      data: {
        keywordId: keyword.id,
        position: result.position,
        previousPosition,
        url: result.url,
        serpFeatures: result.serpFeatures,
        checkedAt: new Date(),
      },
    })

    // Notify project owner if position changed by >= 5
    if (
      result.position !== null &&
      previousPosition !== null &&
      Math.abs(result.position - previousPosition) >= 5
    ) {
      await this.createRankChangeNotification(keyword, previousPosition, result.position)
    }
  }

  // -------------------------------------------------------------------------
  // DataForSEO SERP check
  // -------------------------------------------------------------------------
  async checkKeywordRank(keyword: KeywordWithProject): Promise<RankCheckResult> {
    const login = process.env.DATAFORSEO_LOGIN
    const password = process.env.DATAFORSEO_PASSWORD

    if (!login || !password) {
      // Return mock data in dev
      return {
        position: Math.floor(Math.random() * 50) + 1,
        url: null,
        serpFeatures: { ai_overview: false, featured_snippet: false, paa: false },
      }
    }

    const DFS_LOCATION_CODES: Record<string, number> = {
      TR: 2792, US: 2840, GB: 2826, UK: 2826, DE: 2276, FR: 2250, ES: 2724,
      IT: 2380, NL: 2528, RU: 2643, IN: 2356, SA: 2682, AE: 2784, AT: 2040,
      CH: 2756, BE: 2056, CA: 2124, AU: 2036, BR: 2076, PL: 2616, SE: 2752,
    }
    const locationCode =
      DFS_LOCATION_CODES[(keyword.project.country ?? 'TR').toUpperCase()] ?? 2792

    const MAX_ATTEMPTS = 3
    // Exponential backoff: 10 s → 30 s → 60 s
    const BACKOFF_MS = [10_000, 30_000, 60_000]
    let lastError: Error = new Error('unknown')

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await axios.post<DataForSeoSerpResponse>(
          'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
          [
            {
              keyword: keyword.phrase,
              location_code: locationCode,
              language_code: keyword.language ?? keyword.project.language ?? 'tr',
              depth: 100,
            },
          ],
          { auth: { username: login, password }, timeout: 30000 },
        )

        const task = response.data?.tasks?.[0]
        const results = task?.result?.[0]?.items ?? []
        const organic = results.filter((r) => r.type === 'organic')
        const domain = normalizeDomain(keyword.project.domain)
        const found = organic.find(
          (r) => r.domain && (normalizeDomain(r.domain).includes(domain) || domain.includes(normalizeDomain(r.domain))),
        )

        return {
          position: found?.rank_absolute ?? null,
          url: found?.url ?? null,
          serpFeatures: {
            ai_overview: results.some((r) => r.type === 'ai_overview'),
            featured_snippet: results.some((r) => r.type === 'featured_snippet'),
            paa: results.some((r) => r.type === 'people_also_ask'),
          },
        }
      } catch (err) {
        lastError = err as Error
        if (attempt < MAX_ATTEMPTS) {
          const delay = BACKOFF_MS[attempt - 1]
          this.logger.warn(
            `DataForSEO attempt ${attempt}/${MAX_ATTEMPTS} failed for "${keyword.phrase}" (${lastError.message}) — retrying in ${delay / 1000}s`,
          )
          await sleep(delay)
        }
      }
    }

    // All 3 attempts failed — throw so the circuit breaker in handleCheckAll can count it
    throw new Error(`DataForSEO failed after ${MAX_ATTEMPTS} attempts for "${keyword.phrase}": ${lastError.message}`)
  }

  // -------------------------------------------------------------------------
  // Create rank-change notification for the project owner
  // -------------------------------------------------------------------------
  private async createRankChangeNotification(
    keyword: KeywordWithProject,
    previousPosition: number,
    newPosition: number,
  ): Promise<void> {
    const improved = newPosition < previousPosition
    const delta = Math.abs(newPosition - previousPosition)

    // Find the project owner (user who created the project)
    const project = await this.prisma.project.findUnique({
      where: { id: keyword.projectId },
      select: { createdByUserId: true, name: true },
    })
    if (!project?.createdByUserId) return

    const title = improved
      ? `"${keyword.phrase}" sıralaması yükseldi`
      : `"${keyword.phrase}" sıralaması düştü`

    const body = improved
      ? `"${keyword.phrase}" anahtar kelimesi ${delta} sıra yükselerek ${previousPosition}. sıradan ${newPosition}. sıraya çıktı.`
      : `"${keyword.phrase}" anahtar kelimesi ${delta} sıra düşerek ${previousPosition}. sıradan ${newPosition}. sıraya geriledi.`

    await this.prisma.notification.create({
      data: {
        userId: project.createdByUserId,
        type: improved ? 'RANK_IMPROVED' : 'RANK_DROPPED',
        title,
        body,
        isRead: false,
        link: `/projects/${keyword.projectId}/rank-tracking`,
        meta: {
          keywordId: keyword.id,
          phrase: keyword.phrase,
          previousPosition,
          newPosition,
          delta,
          improved,
        },
      },
    })
  }
}
