import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../prisma.service'

export interface RankDistribution {
  top3: number
  top10: number
  top20: number
  top50: number
  beyond50: number
  notRanking: number
  total: number
}

export interface VisibilityBreakdownItem {
  phrase: string
  position: number
  searchVolume: number | null
  contribution: number
}

export interface VisibilityScoreResult {
  visibilityScore: number
  breakdown: VisibilityBreakdownItem[]
}

@Injectable()
export class RankTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('rank-tracking') private readonly rankQueue: Queue,
  ) {}

  // -------------------------------------------------------------------------
  // 1. getRankDistribution
  // -------------------------------------------------------------------------
  async getRankDistribution(projectId: string): Promise<RankDistribution> {
    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      include: {
        ranks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    })

    const dist: RankDistribution = {
      top3: 0,
      top10: 0,
      top20: 0,
      top50: 0,
      beyond50: 0,
      notRanking: 0,
      total: keywords.length,
    }

    for (const kw of keywords) {
      const pos = kw.ranks[0]?.position ?? null

      if (pos === null || pos === undefined) {
        dist.notRanking++
      } else if (pos <= 3) {
        dist.top3++
      } else if (pos <= 10) {
        dist.top10++
      } else if (pos <= 20) {
        dist.top20++
      } else if (pos <= 50) {
        dist.top50++
      } else {
        dist.beyond50++
      }
    }

    return dist
  }

  // -------------------------------------------------------------------------
  // 2. getKeywordHistory
  // -------------------------------------------------------------------------
  async getKeywordHistory(keywordId: string, days = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return this.prisma.keywordRank.findMany({
      where: { keywordId, checkedAt: { gte: since } },
      orderBy: { checkedAt: 'asc' },
    })
  }

  // -------------------------------------------------------------------------
  // 3. refreshKeyword
  // -------------------------------------------------------------------------
  async refreshKeyword(keywordId: string) {
    await this.rankQueue.add('check-single', { keywordId })
    return { queued: true, keywordId }
  }

  // -------------------------------------------------------------------------
  // 4. getVisibilityScore
  // -------------------------------------------------------------------------
  async getVisibilityScore(projectId: string): Promise<VisibilityScoreResult> {
    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      include: {
        ranks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    })

    let totalScore = 0
    const maxPossible = keywords.reduce((sum, k) => sum + (k.searchVolume ?? 0), 0)
    const breakdown: VisibilityBreakdownItem[] = []

    for (const kw of keywords) {
      const latestRank = kw.ranks[0]
      const pos = latestRank?.position ?? null

      if (pos !== null && pos !== undefined && pos <= 10) {
        const contribution = ((110 - pos) / 110) * (kw.searchVolume ?? 0)
        totalScore += contribution
        breakdown.push({
          phrase: kw.phrase,
          position: pos,
          searchVolume: kw.searchVolume ?? null,
          contribution: Math.round(contribution),
        })
      }
    }

    // Sort breakdown by contribution descending
    breakdown.sort((a, b) => b.contribution - a.contribution)

    const visibilityScore =
      maxPossible > 0 ? Math.min(100, Math.round((totalScore / maxPossible) * 100)) : 0

    return { visibilityScore, breakdown }
  }
}
