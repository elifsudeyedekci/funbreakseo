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

/**
 * Recursively walks DataForSEO AI items collecting every references[] entry
 * (the real citation location) and all text. Handles top-level item.references,
 * nested item.items[].references and deeper. Returns flat refs + joined text.
 */
function collectReferences(items: unknown[]): {
  text: string
  refs: Array<{ url: string; domain: string; title?: string; source?: string }>
} {
  const refs: Array<{ url: string; domain: string; title?: string; source?: string }> = []
  const texts: string[] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const obj = node as Record<string, unknown>
    if (typeof obj.text === 'string') texts.push(obj.text as string)
    const references = obj.references
    if (Array.isArray(references)) {
      for (const r of references) {
        if (r && typeof r === 'object') {
          const rr = r as Record<string, unknown>
          const url = (rr.url as string) ?? ''
          const rawDomain = (rr.domain as string) ?? url
          const domain = normalizeDomain(rawDomain)
          if (domain || url) {
            refs.push({ url, domain, title: rr.title as string, source: rr.source as string })
          }
        }
      }
    }
    const nested = obj.items
    if (Array.isArray(nested)) for (const c of nested) walk(c)
  }
  for (const it of items) walk(it)
  return { text: texts.join(' '), refs }
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
      select: { id: true, domain: true, country: true, organization: { select: { ownerUserId: true } } },
    })
    if (!project) {
      this.logger.error(`Project ${projectId} not found`)
      return
    }

    const projectDomain = normalizeDomain(project.domain)
    const brandName = extractBrandNameFromDomain(project.domain)
    // Project country → DataForSEO location_code (multi-country SaaS; never hardcode TR).
    const DFS_LOCATION_CODES: Record<string, number> = {
      TR: 2792, US: 2840, GB: 2826, UK: 2826, DE: 2276, FR: 2250, ES: 2724,
      IT: 2380, NL: 2528, RU: 2643, IN: 2356, SA: 2682, AE: 2784, AT: 2040,
      CH: 2756, BE: 2056, CA: 2124, AU: 2036, BR: 2076, PL: 2616, SE: 2752,
    }
    const locationCode = DFS_LOCATION_CODES[(project.country ?? 'TR').toUpperCase()] ?? 2792

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
              location_code: locationCode,
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

        // Collect text + references recursively (references[] is where AI
        // Overview citations actually live — not items[].url).
        const collected = collectReferences(aiItems)
        responseText = collected.text
        sources = collected.refs.map((r) => ({ url: r.url, domain: r.domain, title: r.title }))

        const citationEntryAio = sources.find((s) => s.domain.includes(projectDomain) || projectDomain.includes(s.domain))
        const brandCitedAio = !!citationEntryAio
        // Mentioned if brand appears in the answer text OR is cited as a source
        const brandMentionedAio = responseText.toLowerCase().includes(brandName) || brandCitedAio
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

      // Also check Google AI Mode (dedicated AI Mode SERP endpoint).
      try {
        const aiModeResponse = await axios.post<DataForSeoResponse>(
          'https://api.dataforseo.com/v3/serp/google/ai_mode/live/advanced',
          [
            {
              keyword: geoQuery.prompt,
              location_code: locationCode,
              language_code: geoQuery.language,
            },
          ],
          {
            auth: { username: login, password },
            timeout: 30000,
          },
        )

        const modeTask = aiModeResponse.data?.tasks?.[0]
        const modeItems = modeTask?.result?.[0]?.items ?? []

        // references[] is where AI Mode citations live (incl. nested items)
        const collectedMode = collectReferences(modeItems)
        const aiModeText = collectedMode.text
        const aiModeSources = collectedMode.refs.map((r) => ({ url: r.url, domain: r.domain }))

        const brandMentionedMode =
          aiModeText.toLowerCase().includes(brandName) ||
          aiModeSources.some((s) => s.domain.includes(projectDomain) || projectDomain.includes(s.domain))
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

      // ----------------------------------------------------------------
      // LLM Mentions (AI Optimization): real ChatGPT / Gemini / Perplexity
      // brand-mention measurement. Each platform is best-effort — a failing
      // or unsubscribed endpoint is skipped without breaking the scan.
      // ----------------------------------------------------------------
      const llmPlatforms: Array<{ platform: GeoplatForm; path: string; model: string }> = [
        { platform: GeoplatForm.CHATGPT, path: 'chat_gpt', model: 'gpt-4o-mini' },
        { platform: GeoplatForm.GEMINI, path: 'gemini', model: 'gemini-1.5-flash' },
        { platform: GeoplatForm.PERPLEXITY, path: 'perplexity', model: 'sonar' },
        // Claude was missing — its platform card always showed 0. Added (skipped
        // gracefully if the account/endpoint doesn't support it).
        { platform: GeoplatForm.CLAUDE, path: 'claude', model: 'claude-3-5-sonnet' },
      ]
      for (const lp of llmPlatforms) {
        try {
          const llmResp = await axios.post<{ tasks?: Array<{ status_code?: number; result?: unknown }> }>(
            `https://api.dataforseo.com/v3/ai_optimization/${lp.path}/llm_responses/live`,
            [
              {
                user_prompt: geoQuery.prompt,
                model_name: lp.model,
                location_code: locationCode,
                language_code: geoQuery.language,
                web_search: true,
              },
            ],
            { auth: { username: login, password }, timeout: 45000 },
          )
          const task = llmResp.data?.tasks?.[0]
          if (!task || (task.status_code && task.status_code !== 20000)) {
            this.logger.warn(`LLM ${lp.path} unavailable (status ${task?.status_code})`)
            continue
          }
          // Structure-agnostic detection: search the whole result payload for
          // the brand name (mention) and the project domain (citation).
          const blob = JSON.stringify(task.result ?? []).toLowerCase()
          const mentioned = blob.includes(brandName)
          const cited = blob.includes(projectDomain)
          platformResults.push({
            platform: lp.platform,
            brandMentioned: mentioned || cited,
            brandCited: cited,
            citedUrl: null,
            position: null,
            sentiment: Sentiment.NEUTRAL,
            responseSnippet: '',
            sourcesJson: [],
          })
          this.logger.log(`LLM ${lp.path}: mentioned=${mentioned} cited=${cited}`)
        } catch (err) {
          this.logger.warn(`LLM ${lp.path} call failed: ${(err as Error).message}`)
        }
      }
    }

    // ------------------------------------------------------------------
    // 4. Create GeoResult records
    // ------------------------------------------------------------------
    const now = new Date()
    // Replace, don't accumulate: each scan of a query must reflect ONLY its
    // latest result. Without this, mention/citation counts kept growing every
    // scan (6 → 30). Delete this query's previous results first.
    await this.prisma.geoResult.deleteMany({ where: { geoQueryId } })
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

    // Get all results for this project — same filter as getGeoOverview() so the
    // persisted geoVisibilityScore matches exactly what the GEO page shows.
    const allProjectResults = await this.prisma.geoResult.findMany({
      where: { geoQuery: { projectId } },
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

    // Persist the project's GEO visibility = mentioned / (queries × platforms),
    // the SAME basis the GEO page and dashboard use — so the projects LIST
    // (which reads project.geoVisibilityScore) matches everywhere.
    const visibilityPercent = totalSourcesSeen > 0 ? Math.round((totalMentions / totalSourcesSeen) * 100) : 0
    await this.prisma.project.update({
      where: { id: projectId },
      data: { geoVisibilityScore: visibilityPercent },
    }).catch(() => {})

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

    // project.geoVisibilityScore is already saved above (visibilityPercent).
    // No second overwrite — keeps the same formula as the GEO page.

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
      `[Job ${job.id}] Geo check done — mentions=${totalMentions} citations=${totalCitations} visibility=${visibilityPercent}%`,
    )
  }
}
