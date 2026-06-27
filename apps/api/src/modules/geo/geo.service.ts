import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { GeoplatForm } from '@prisma/client'
import { PrismaService } from '../../prisma.service'

export interface AddGeoQueryDto {
  prompt: string
  location?: string
  language?: string
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name)

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('geo') private readonly geoQueue: Queue,
  ) {}

  // -------------------------------------------------------------------------
  // 1. addGeoQuery
  // -------------------------------------------------------------------------
  async addGeoQuery(projectId: string, dto: AddGeoQueryDto) {
    const query = await this.prisma.geoQuery.create({
      data: {
        projectId,
        prompt: dto.prompt,
        location: dto.location ?? 'Turkey',
        language: dto.language ?? 'tr',
      },
    })

    await this.geoQueue.add('check', { geoQueryId: query.id, projectId })

    return query
  }

  // -------------------------------------------------------------------------
  // 2. listGeoQueries
  // -------------------------------------------------------------------------
  async triggerScan(projectId: string) {
    let queries = await this.prisma.geoQuery.findMany({
      where: { projectId },
      select: { id: true, prompt: true },
    })

    // Auto-create BUSINESS queries if none exist. We use the project's own
    // tracked keywords (highest search volume first) as natural search prompts —
    // NOT the domain name. AI visibility is about whether the brand surfaces for
    // real sector queries like "alkol vale hizmeti", not "domain.com nedir".
    if (queries.length === 0) {
      const autoPrompts = await this.buildBusinessQueries(projectId)
      for (const prompt of autoPrompts) {
        try {
          const q = await this.prisma.geoQuery.create({
            data: { projectId, prompt, location: 'Turkey', language: 'tr' },
          })
          queries.push({ id: q.id, prompt: q.prompt })
        } catch (err) {
          this.logger.warn(`Auto-query creation failed: ${prompt}`, err)
        }
      }
    }

    for (const q of queries) {
      await this.geoQueue.add('check', { geoQueryId: q.id, projectId })
    }
    return { queued: queries.length }
  }

  /**
   * Builds natural business search queries for GEO scanning from the project's
   * highest-volume tracked keywords. Never includes the domain/brand name as the
   * query subject. Falls back to nothing if the project has no keywords yet
   * (caller should ensure keywords exist, e.g. via full-scan ordering).
   */
  private async buildBusinessQueries(projectId: string): Promise<string[]> {
    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      orderBy: [{ searchVolume: 'desc' }],
      take: 8,
      select: { phrase: true },
    })

    const phrases = keywords
      .map((k) => k.phrase.trim())
      .filter((p) => p.length >= 3)

    // Use the top phrases directly as natural-language search prompts.
    return Array.from(new Set(phrases)).slice(0, 6)
  }

  // -------------------------------------------------------------------------
  // deleteGeoQuery
  // -------------------------------------------------------------------------
  async deleteGeoQuery(projectId: string, queryId: string) {
    const query = await this.prisma.geoQuery.findFirst({
      where: { id: queryId, projectId },
    })
    if (!query) {
      throw new NotFoundException('GEO query not found')
    }
    await this.prisma.geoQuery.delete({ where: { id: queryId } })
    return { message: 'GEO query deleted' }
  }

  // -------------------------------------------------------------------------
  // 2. listGeoQueries
  // -------------------------------------------------------------------------
  async listGeoQueries(projectId: string) {
    return this.prisma.geoQuery.findMany({
      where: { projectId },
      include: {
        results: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // -------------------------------------------------------------------------
  // 3. getGeoOverview
  // -------------------------------------------------------------------------
  async getGeoOverview(projectId: string) {
    // Get all results for the project
    const allResults = await this.prisma.geoResult.findMany({
      where: { geoQuery: { projectId } },
      orderBy: { checkedAt: 'desc' },
    })

    const mentionCount = allResults.filter((r) => r.brandMentioned).length
    const citationCount = allResults.filter((r) => r.brandCited).length
    const citationToMentionRatio =
      mentionCount > 0 ? citationCount / mentionCount : 0

    // Build byPlatform breakdown
    const platforms = Object.values(GeoplatForm)
    const byPlatform: Record<string, { mentions: number; citations: number }> = {}
    for (const platform of platforms) {
      const platformResults = allResults.filter((r) => r.platform === platform)
      byPlatform[platform] = {
        mentions: platformResults.filter((r) => r.brandMentioned).length,
        citations: platformResults.filter((r) => r.brandCited).length,
      }
    }

    // Latest snapshot
    const latestSnapshot = await this.prisma.geoVisibilitySnapshot.findFirst({
      where: { projectId },
      orderBy: { date: 'desc' },
    })

    // Trend: last 7 days snapshots
    const trendSince = new Date()
    trendSince.setDate(trendSince.getDate() - 7)
    const trend = await this.prisma.geoVisibilitySnapshot.findMany({
      where: { projectId, date: { gte: trendSince } },
      orderBy: { date: 'asc' },
    })

    return {
      mentionCount,
      citationCount,
      citationToMentionRatio,
      byPlatform,
      latestSnapshot,
      trend,
    }
  }

  // -------------------------------------------------------------------------
  // 4. getGeoCompetitors
  // -------------------------------------------------------------------------
  async getGeoCompetitors(projectId: string) {
    return this.prisma.geoCompetitor.findMany({
      where: { projectId },
      orderBy: { shareOfVoice: 'desc' },
    })
  }

  // -------------------------------------------------------------------------
  // 5. getGeoRecommendations
  // -------------------------------------------------------------------------
  async getGeoRecommendations(projectId: string) {
    const overview = await this.getGeoOverview(projectId)
    const competitors = await this.getGeoCompetitors(projectId)

    const { citationToMentionRatio, mentionCount, byPlatform } = overview

    const recommendations: Array<{
      type: string
      priority: 'HIGH' | 'MEDIUM' | 'LOW'
      title: string
      description: string
      action: string
    }> = []

    // Recommendation: low citation-to-mention ratio → answer-first content
    if (citationToMentionRatio < 0.1) {
      recommendations.push({
        type: 'ANSWER_FIRST',
        priority: 'HIGH',
        title: 'İçeriğinizi cevap-önce formatına çevirin',
        description:
          'AI modelleri, doğrudan ve özlü cevaplar veren içerikleri daha fazla kaynak gösteriyor. ' +
          'Şu anda markanız bahsediliyor ancak kaynak olarak gösterilmiyor.',
        action:
          'Mevcut içeriklerinizin ilk paragrafını, sorunun doğrudan cevabıyla başlatın.',
      })
    }

    // Recommendation: brand not being mentioned at all → content gap
    if (mentionCount === 0) {
      recommendations.push({
        type: 'CONTENT_GAP',
        priority: 'HIGH',
        title: 'AI araçlarında marka görünürlüğü sıfır',
        description:
          'Markanız henüz hiçbir AI platformunda bahsedilmiyor. ' +
          'Temel konu alanlarınızda kapsamlı içerik üretmeye başlayın.',
        action:
          'En az 10 adet soru-cevap formatında içerik üretin ve bunları öne çıkan snippet için optimize edin.',
      })
    }

    // Recommendation: competitor has high share of voice
    const topCompetitor = competitors[0]
    if (topCompetitor && (topCompetitor.shareOfVoice ?? 0) > 0.3) {
      recommendations.push({
        type: 'COMPETITOR_GAP',
        priority: 'MEDIUM',
        title: `Rakip "${topCompetitor.domain}" AI görünürlüğünde öne geçiyor`,
        description:
          `"${topCompetitor.domain}" platformların %${Math.round((topCompetitor.shareOfVoice ?? 0) * 100)} ses payına sahip. ` +
          'Rakibin hangi konularda öne çıktığını analiz edin.',
        action:
          'Rakibin sık alıntılanan sayfalarını inceleyin ve benzer veya daha kapsamlı içerikler üretin.',
      })
    }

    // Recommendation: GOOGLE_AI_OVERVIEW coverage is low
    const gaoMentions = byPlatform[GeoplatForm.GOOGLE_AI_OVERVIEW]?.mentions ?? 0
    if (gaoMentions === 0) {
      recommendations.push({
        type: 'GOOGLE_AIO',
        priority: 'HIGH',
        title: "Google AI Overview'da görünmüyorsunuz",
        description:
          'Google AI Overview, organik trafiğin önemli bir bölümünü etkiliyor. ' +
          'Markanız bu bölümde henüz yer almıyor.',
        action:
          'E-E-A-T sinyallerini güçlendirin: uzman yazar bilgisi, kaynak gösterme ve yapılandırılmış veri (Schema.org) ekleyin.',
      })
    }

    // Recommendation: no Perplexity citations
    const perplexityCitations = byPlatform[GeoplatForm.PERPLEXITY]?.citations ?? 0
    if (perplexityCitations === 0) {
      recommendations.push({
        type: 'PERPLEXITY_CITATION',
        priority: 'LOW',
        title: "Perplexity'de kaynak gösterilmiyorsunuz",
        description:
          "Perplexity, araştırma odaklı kullanıcılar arasında popüler. " +
          'İçerikleriniz bu platformda kaynak olarak gösterilmiyor.',
        action:
          'İstatistikler, araştırma verileri ve özgün analizler içeren içerikler ekleyin — Perplexity bunları tercih eder.',
      })
    }

    // Recommendation: citation ratio improving tip when moderate
    if (citationToMentionRatio >= 0.1 && citationToMentionRatio < 0.3) {
      recommendations.push({
        type: 'IMPROVE_CITATION_RATE',
        priority: 'MEDIUM',
        title: 'Alıntı oranını artırın',
        description:
          `Mevcut alıntı/bahsedilme oranınız ${(citationToMentionRatio * 100).toFixed(0)}%. ` +
          'Hedef %30 ve üzeridir.',
        action:
          'Structured data (FAQ, HowTo, Article) ekleyin ve içeriklerin canonical URL yapısını düzeltin.',
      })
    }

    return recommendations
  }

  // -------------------------------------------------------------------------
  // 6. getGeoHistory
  // -------------------------------------------------------------------------
  async getGeoHistory(projectId: string, days = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return this.prisma.geoVisibilitySnapshot.findMany({
      where: { projectId, date: { gte: since } },
      orderBy: { date: 'asc' },
    })
  }
}
