import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { GeoplatForm, GeoQueryStatus, Sentiment } from '@prisma/client'
import axios from 'axios'
import { PrismaService } from '../../prisma.service'

interface DataForSeoAiOverviewTask {
  result?: Array<{
    items?: Array<{
      type: string
      text?: string
      items?: Array<{
        type: string
        url?: string
        domain?: string
        title?: string
      }>
    }>
  }>
}

interface DataForSeoResponse {
  tasks?: DataForSeoAiOverviewTask[]
}

function extractBrandNameFromDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .split('.')[0]
    .toLowerCase()
}

function normalizeDomain(raw: string): string {
  return raw
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .toLowerCase()
}

function detectSentiment(text: string, brandName: string): Sentiment {
  if (!text) return Sentiment.NEUTRAL
  const lower = text.toLowerCase()
  const positiveWords = ['iyi', 'harika', 'mükemmel', 'önerilir', 'güvenilir', 'best', 'great', 'excellent', 'recommended', 'trusted', 'leading', 'top']
  const negativeWords = ['kötü', 'berbat', 'güvensiz', 'sorunlu', 'avoid', 'bad', 'poor', 'unreliable', 'worst', 'scam']

  // Look for sentiment near the brand mention
  const brandIdx = lower.indexOf(brandName)
  const window = brandIdx >= 0 ? lower.slice(Math.max(0, brandIdx - 100), brandIdx + 200) : lower

  const positiveHits = positiveWords.filter((w) => window.includes(w)).length
  const negativeHits = negativeWords.filter((w) => window.includes(w)).length

  if (positiveHits > negativeHits) return Sentiment.POSITIVE
  if (negativeHits > positiveHits) return Sentiment.NEGATIVE
  return Sentiment.NEUTRAL
}

@Processor('geo')
@Injectable()
export class GeoWorker extends WorkerHost {
  private readonly logger = new Logger(GeoWorker.name)

  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async process(job: Job<{ geoQueryId: string; projectId: string }>): Promise<void> {
    const { geoQueryId, projectId } = job.data
    this.logger.log(`[Job ${job.id}] Processing geo check — query=${geoQueryId} project=${projectId}`)

    // ------------------------------------------------------------------
    // 1. Fetch GeoQuery
    // ------------------------------------------------------------------
    const geoQuery = await this.prisma.geoQuery.findUnique({
      where: { id: geoQueryId },
    })
    if (!geoQuery || geoQuery.status === GeoQueryStatus.PAUSED) {
      this.logger.warn(`GeoQuery ${geoQueryId} not found or paused, skipping`)
      return
    }

    // ------------------------------------------------------------------
    // 2. Fetch project domain
    // ------------------------------------------------------------------
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, domain: true, organization: { select: { ownerUserId: true } } },
    })
    if (!project) {
      this.logger.error(`Project ${projectId} not found`)
      return
    }

    const projectDomain = normalizeDomain(project.domain)
    const brandName = extractBrandNameFromDomain(project.domain)

    // ------------------------------------------------------------------
    // 3. Call DataForSEO Google AI Overview API (or use mock in dev)
    // ------------------------------------------------------------------
    const login = process.env.DATAFORSEO_LOGIN
    const password = process.env.DATAFORSEO_PASSWORD

    let responseText = ''
    let sources: Array<{ url: string; domain: string; title?: string }> = []
    let platformResults: Array<{
      platform: GeoplatForm
      brandMentioned: boolean
      brandCited: boolean
      citedUrl: string | null
      position: number | null
      sentiment: Sentiment
      responseSnippet: string
      sourcesJson: unknown
    }> = []

    if (!login || !password) {
      this.logger.warn('DATAFORSEO credentials not set — using mock data')

      // Mock result for GOOGLE_AI_OVERVIEW
      const mockMentioned = Math.random() > 0.4
      const mockCited = mockMentioned && Math.random() > 0.5
      const mockSnippet = mockMentioned
        ? `${brandName} bu alanda önde gelen çözümlerden biridir. Kullanıcılar tarafından sıkça tercih edilmektedir.`
        : `Bu konuda çeşitli araçlar ve platformlar mevcuttur.`

      platformResults = [
        {
          platform: GeoplatForm.GOOGLE_AI_OVERVIEW,
          brandMentioned: mockMentioned,
          brandCited: mockCited,
          citedUrl: mockCited ? `https://${project.domain}` : null,
          position: mockCited ? Math.floor(Math.random() * 5) + 1 : null,
          sentiment: mockMentioned ? Sentiment.POSITIVE : Sentiment.NEUTRAL,
          responseSnippet: mockSnippet,
          sourcesJson: mockCited ? [{ url: `https://${project.domain}`, domain: projectDomain }] : [],
        },
      ]
    } else {
      try {
        // Call DataForSEO AI Overview endpoint
        const aiOverviewResponse = await axios.post<DataForSeoResponse>(
          'https://api.dataforseo.com/v3/serp/google/ai_overview/live',
          [
            {
              keyword: geoQuery.prompt,
              location_code: 2792, // Turkey
              language_code: geoQuery.language,
            },
          ],
          {
            auth: { username: login, password },
            timeout: 30000,
          },
        )

        const aiTask = aiOverviewResponse.data?.tasks?.[0]
        const aiResult = aiTask?.result?.[0]
        const aiItems = aiResult?.items ?? []

        // Extract text content from AI overview items
        const textItem = aiItems.find((item) => item.type === 'ai_overview' || item.type === 'answer_box')
        responseText = textItem?.text ?? ''

        // Extract sources/citations
        for (const item of aiItems) {
          if (item.items) {
            for (const sub of item.items) {
              if (sub.url && sub.domain) {
                sources.push({ url: sub.url, domain: normalizeDomain(sub.domain), title: sub.title })
              }
            }
          }
        }

        const brandMentionedAio = responseText.toLowerCase().includes(brandName)
        const citationEntryAio = sources.find((s) => s.domain.includes(projectDomain) || projectDomain.includes(s.domain))
        const brandCitedAio = !!citationEntryAio
        const sentimentAio = detectSentiment(responseText, brandName)

        platformResults.push({
          platform: GeoplatForm.GOOGLE_AI_OVERVIEW,
          brandMentioned: brandMentionedAio,
          brandCited: brandCitedAio,
          citedUrl: citationEntryAio?.url ?? null,
          position: brandCitedAio ? (sources.indexOf(citationEntryAio!) + 1) : null,
          sentiment: sentimentAio,
          responseSnippet: responseText.slice(0, 2000),
          sourcesJson: sources,
        })
      } catch (err) {
        this.logger.error(`DataForSEO AI Overview call failed: ${(err as Error).message}`)

        // Fallback to neutral mock on error
        platformResults.push({
          platform: GeoplatForm.GOOGLE_AI_OVERVIEW,
          brandMentioned: false,
          brandCited: false,
          citedUrl: null,
          position: null,
          sentiment: Sentiment.NEUTRAL,
          responseSnippet: '',
          sourcesJson: [],
        })
      }

      // Also check Google AI Mode (organic advanced endpoint for AI features)
      try {
        const organicResponse = await axios.post<DataForSeoResponse>(
          'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
          [
            {
              keyword: geoQuery.prompt,
              location_code: 2792,
              language_code: geoQuery.language,
              depth: 100,
            },
          ],
          {
            auth: { username: login, password },
            timeout: 30000,
          },
        )

        const orgTask = organicResponse.data?.tasks?.[0]
        const orgItems = orgTask?.result?.[0]?.items ?? []

        // Collect AI mode items
        const aiModeItems = orgItems.filter(
          (item: { type: string }) => item.type === 'ai_overview' || item.type === 'generative_ai',
        )
        const aiModeText = aiModeItems.map((i: { text?: string }) => i.text ?? '').join(' ')

        const aiModeSources: Array<{ url: string; domain: string }> = []
        for (const item of aiModeItems as Array<{ items?: Array<{ url?: string; domain?: string }> }>) {
          if (item.items) {
            for (const sub of item.items) {
              if (sub.url && sub.domain) {
                aiModeSources.push({ url: sub.url, domain: normalizeDomain(sub.domain) })
              }
            }
          }
        }

        const brandMentionedMode = aiModeText.toLowerCase().includes(brandName)
        const citationEntryMode = aiModeSources.find(
          (s) => s.domain.includes(projectDomain) || projectDomain.includes(s.domain),
        )
        const brandCitedMode = !!citationEntryMode

        platformResults.push({
          platform: GeoplatForm.GOOGLE_AI_MODE,
          brandMentioned: brandMentionedMode,
          brandCited: brandCitedMode,
          citedUrl: citationEntryMode?.url ?? null,
          position: brandCitedMode ? (aiModeSources.indexOf(citationEntryMode!) + 1) : null,
          sentiment: detectSentiment(aiModeText, brandName),
          responseSnippet: aiModeText.slice(0, 2000),
          sourcesJson: aiModeSources,
        })
      } catch (err) {
        this.logger.warn(`DataForSEO Google AI Mode call failed: ${(err as Error).message}`)
      }
    }

    // ------------------------------------------------------------------
    // 4. Create GeoResult records
    // ------------------------------------------------------------------
    const now = new Date()
    for (const pr of platformResults) {
      await this.prisma.geoResult.create({
        data: {
          geoQueryId,
          platform: pr.platform,
          brandMentioned: pr.brandMentioned,
          brandCited: pr.brandCited,
          citedUrl: pr.citedUrl,
          position: pr.position,
          sentiment: pr.sentiment,
          responseSnippet: pr.responseSnippet,
          sourcesJson: pr.sourcesJson ?? [],
          checkedAt: now,
        },
      })
    }

    // ------------------------------------------------------------------
    // 5. Update GeoQuery.checkedAt
    // ------------------------------------------------------------------
    await this.prisma.geoQuery.update({
      where: { id: geoQueryId },
      data: { checkedAt: now },
    })

    // ------------------------------------------------------------------
    // 6. Update/create daily GeoVisibilitySnapshot
    // ------------------------------------------------------------------
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    // Get all results for this project for today's aggregation
    const allProjectResults = await this.prisma.geoResult.findMany({
      where: {
        geoQuery: { projectId, status: GeoQueryStatus.ACTIVE },
      },
    })

    const totalMentions = allProjectResults.filter((r) => r.brandMentioned).length
    const totalCitations = allProjectResults.filter((r) => r.brandCited).length
    const ratio = totalMentions > 0 ? totalCitations / totalMentions : 0

    const platformBreakdown: Record<string, { mentions: number; citations: number }> = {}
    for (const platform of Object.values(GeoplatForm)) {
      const pResults = allProjectResults.filter((r) => r.platform === platform)
      platformBreakdown[platform] = {
        mentions: pResults.filter((r) => r.brandMentioned).length,
        citations: pResults.filter((r) => r.brandCited).length,
      }
    }

    // Calculate share of voice: compare our citations to total sources seen
    const totalSourcesSeen = allProjectResults.length
    const shareOfVoice = totalSourcesSeen > 0 ? totalCitations / totalSourcesSeen : 0

    await this.prisma.geoVisibilitySnapshot.upsert({
      where: { projectId_date: { projectId, date: today } },
      create: {
        projectId,
        date: today,
        mentionCount: totalMentions,
        citationCount: totalCitations,
        citationToMentionRatio: ratio,
        shareOfVoice,
        byPlatform: platformBreakdown,
      },
      update: {
        mentionCount: totalMentions,
        citationCount: totalCitations,
        citationToMentionRatio: ratio,
        shareOfVoice,
        byPlatform: platformBreakdown,
      },
    })

    // ------------------------------------------------------------------
    // 7. Update Project.geoVisibilityScore (0–100)
    // ------------------------------------------------------------------
    // Score formula: based on citation ratio (50%) and mention frequency (50%)
    // citation ratio: ratio * 100 capped at 50 pts
    // mention frequency: (totalMentions / max(total queries * platforms, 1)) * 50 pts
    const totalActiveQueries = await this.prisma.geoQuery.count({
      where: { projectId, status: GeoQueryStatus.ACTIVE },
    })
    const maxExpected = Math.max(totalActiveQueries * 2, 1) // 2 platforms minimum
    const mentionFrequencyScore = Math.min(50, (totalMentions / maxExpected) * 50)
    const citationRatioScore = Math.min(50, ratio * 100)
    const geoVisibilityScore = Math.round(mentionFrequencyScore + citationRatioScore)

    await this.prisma.project.update({
      where: { id: projectId },
      data: { geoVisibilityScore },
    })

    // ------------------------------------------------------------------
    // 8. Update GeoCompetitor records from sources found in responses
    // ------------------------------------------------------------------
    const allSources: string[] = []
    for (const pr of platformResults) {
      if (Array.isArray(pr.sourcesJson)) {
        for (const src of pr.sourcesJson as Array<{ domain?: string; url?: string }>) {
          const d = src.domain ?? (src.url ? normalizeDomain(src.url) : null)
          if (d && !d.includes(projectDomain)) {
            allSources.push(d)
          }
        }
      }
    }

    // Count occurrences per competitor domain
    const domainCounts: Record<string, number> = {}
    for (const domain of allSources) {
      domainCounts[domain] = (domainCounts[domain] ?? 0) + 1
    }

    for (const [domain, count] of Object.entries(domainCounts)) {
      if (!domain) continue
      try {
        const existing = await this.prisma.geoCompetitor.findUnique({
          where: { projectId_domain: { projectId, domain } },
        })

        if (existing) {
          const newCitationCount = existing.citationCount + count
          const newMentionCount = existing.mentionCount + count
          const newShareOfVoice = totalSourcesSeen > 0 ? newCitationCount / (totalSourcesSeen + allSources.length) : 0

          await this.prisma.geoCompetitor.update({
            where: { id: existing.id },
            data: {
              mentionCount: newMentionCount,
              citationCount: newCitationCount,
              shareOfVoice: newShareOfVoice,
            },
          })
        } else {
          const newShareOfVoice = totalSourcesSeen > 0 ? count / (totalSourcesSeen + allSources.length) : 0
          await this.prisma.geoCompetitor.create({
            data: {
              projectId,
              domain,
              mentionCount: count,
              citationCount: count,
              shareOfVoice: newShareOfVoice,
            },
          })
        }
      } catch (err) {
        this.logger.warn(`Failed to upsert GeoCompetitor for domain ${domain}: ${(err as Error).message}`)
      }
    }

    this.logger.log(
      `[Job ${job.id}] Geo check done — mentions=${totalMentions} citations=${totalCitations} score=${geoVisibilityScore}`,
    )
  }
}
