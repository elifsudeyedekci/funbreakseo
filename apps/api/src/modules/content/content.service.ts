import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../prisma.service'
import { ContentStatus, ContentType } from '@prisma/client'

interface ScoreBreakdownItem {
  criterion: string
  score: number
  maxScore: number
  note: string
}

interface ScoreResult {
  seoScore: number
  geoScore: number
  breakdown: ScoreBreakdownItem[]
}

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('content') private readonly contentQueue: Queue,
  ) {}

  // ─── 1. Generate Content ────────────────────────────────────────────────────
  async generateContent(projectId: string, dto: any, userId: string) {
    const slug =
      dto.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 60) +
      '-' +
      Date.now()

    const item = await this.prisma.contentItem.create({
      data: {
        projectId,
        type: dto.type,
        title: dto.title,
        slug,
        focusKeyword: dto.focusKeyword,
        secondaryKeywords: dto.secondaryKeywords ?? [],
        status: ContentStatus.GENERATING,
        createdByUserId: userId,
      },
    })

    await this.contentQueue.add('generate', { contentItemId: item.id, dto })

    return item
  }

  // ─── 2. List Content ────────────────────────────────────────────────────────
  async listContent(
    projectId: string,
    filters: {
      status?: ContentStatus
      type?: ContentType
      page?: number
      limit?: number
    },
  ) {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const skip = (page - 1) * limit

    const where: any = { projectId }
    if (filters.status) where.status = filters.status
    if (filters.type) where.type = filters.type

    const [items, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contentItem.count({ where }),
    ])

    return { items, total, page, limit }
  }

  // ─── 3. Get Content ─────────────────────────────────────────────────────────
  async getContent(contentId: string) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      include: {
        scoreBreakdowns: true,
        revisions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    })

    if (!item) {
      throw new NotFoundException(`ContentItem with id ${contentId} not found`)
    }

    return item
  }

  // ─── 4. Update Content ──────────────────────────────────────────────────────
  async updateContent(contentId: string, body: any, userId?: string) {
    const current = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
    })

    if (!current) {
      throw new NotFoundException(`ContentItem with id ${contentId} not found`)
    }

    const latestVersion = current.revisions[0]?.version ?? 0
    const nextVersion = latestVersion + 1

    // Save a revision of the current state before overwriting
    if (current.bodyMarkdown) {
      await this.prisma.contentRevision.create({
        data: {
          contentItemId: contentId,
          version: nextVersion,
          bodyMarkdown: current.bodyMarkdown,
          editedByUserId: userId ?? current.createdByUserId,
          note: 'Auto-saved before update',
        },
      })
    }

    const updated = await this.prisma.contentItem.update({
      where: { id: contentId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.bodyMarkdown !== undefined && { bodyMarkdown: body.bodyMarkdown }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
        ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription }),
      },
    })

    return updated
  }

  // ─── 5. Approve Content ─────────────────────────────────────────────────────
  async approveContent(contentId: string, userId: string) {
    return this.prisma.contentItem.update({
      where: { id: contentId },
      data: {
        status: ContentStatus.APPROVED,
        reviewedByUserId: userId,
      },
    })
  }

  // ─── 6. Reject Content ──────────────────────────────────────────────────────
  async rejectContent(contentId: string, userId: string, reason: string) {
    const current = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
    })

    if (!current) {
      throw new NotFoundException(`ContentItem with id ${contentId} not found`)
    }

    const nextVersion = (current.revisions[0]?.version ?? 0) + 1

    // Record the rejection reason as a revision note
    await this.prisma.contentRevision.create({
      data: {
        contentItemId: contentId,
        version: nextVersion,
        bodyMarkdown: current.bodyMarkdown ?? '',
        editedByUserId: userId,
        note: `Rejected: ${reason}`,
      },
    })

    return this.prisma.contentItem.update({
      where: { id: contentId },
      data: {
        status: ContentStatus.REJECTED,
        reviewedByUserId: userId,
      },
    })
  }

  // ─── 7. Publish Content ─────────────────────────────────────────────────────
  async publishContent(contentId: string, userId: string, publishedUrl?: string) {
    return this.prisma.contentItem.update({
      where: { id: contentId },
      data: {
        status: ContentStatus.PUBLISHED,
        reviewedByUserId: userId,
        ...(publishedUrl !== undefined && { publishedUrl }),
      },
    })
  }

  // ─── 8. Regenerate Section ──────────────────────────────────────────────────
  async regenerateSection(contentId: string, section: string, instructions?: string) {
    await this.contentQueue.add('regenerate-section', {
      contentItemId: contentId,
      section,
      instructions,
    })

    return { queued: true }
  }

  // ─── 9. SEO / GEO Report ────────────────────────────────────────────────────
  async getSeoGeoReport(contentId: string) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      include: { scoreBreakdowns: true },
    })

    if (!item) {
      throw new NotFoundException(`ContentItem with id ${contentId} not found`)
    }

    const SEO_CRITERIA = [
      'KEYWORD_USAGE',
      'HEADING_STRUCTURE',
      'META',
      'INTERNAL_LINKS',
      'SCHEMA',
      'ENTITY_COVERAGE',
      'ANSWER_FIRST',
      'READABILITY',
    ]
    const GEO_CRITERIA = [
      'answer_first',
      'entity_clarity',
      'structured_data',
      'citation_worthy',
      'question_format',
    ]

    const seoBreakdown = item.scoreBreakdowns.filter((b) =>
      SEO_CRITERIA.includes(b.criterion),
    )
    const geoBreakdown = item.scoreBreakdowns.filter((b) =>
      GEO_CRITERIA.includes(b.criterion),
    )

    // Build recommendations for low-scoring criteria (< 50% of maxScore)
    const recommendations: string[] = []

    for (const bd of item.scoreBreakdowns) {
      const ratio = bd.maxScore > 0 ? bd.score / bd.maxScore : 1

      if (ratio < 0.5) {
        switch (bd.criterion) {
          case 'KEYWORD_USAGE':
            recommendations.push(
              `Improve keyword usage: ensure "${item.focusKeyword}" appears in H1, first paragraph, and maintains 1–2% density.`,
            )
            break
          case 'HEADING_STRUCTURE':
            recommendations.push(
              'Add a clear H1 heading and at least two H2 subheadings to improve structure.',
            )
            break
          case 'META':
            recommendations.push(
              'Write a meta title under 60 characters and a meta description under 155 characters, both containing the focus keyword.',
            )
            break
          case 'INTERNAL_LINKS':
            recommendations.push(
              'Add internal links using relative URLs to related content on your site.',
            )
            break
          case 'SCHEMA':
            recommendations.push(
              'Add a JSON-LD Article schema block to help search engines understand your content.',
            )
            break
          case 'ENTITY_COVERAGE':
            recommendations.push(
              'Expand topic coverage by mentioning related entities and concepts.',
            )
            break
          case 'ANSWER_FIRST':
            recommendations.push(
              'Place a direct, concise answer to the main question within the first 100 words.',
            )
            break
          case 'READABILITY':
            recommendations.push(
              'Shorten sentences to an average of under 20 words to improve readability.',
            )
            break
          case 'answer_first':
            recommendations.push(
              'Start the first paragraph with a clear, complete answer to the implied user question.',
            )
            break
          case 'entity_clarity':
            recommendations.push(
              'Define all brand names and key entities clearly on first mention.',
            )
            break
          case 'structured_data':
            recommendations.push(
              'Add structured data (JSON-LD) to make content eligible for rich results in AI-powered search.',
            )
            break
          case 'citation_worthy':
            recommendations.push(
              'Include statistics, percentages, or cited facts to increase citation likelihood.',
            )
            break
          case 'question_format':
            recommendations.push(
              'Add an FAQ section or use question-format headings (##  with "?") to improve question targeting.',
            )
            break
          default:
            recommendations.push(`Improve score for criterion: ${bd.criterion}. ${bd.note ?? ''}`)
        }
      }
    }

    return {
      contentId,
      seoScore: item.seoScore ?? 0,
      geoScore: item.geoScore ?? 0,
      seoBreakdown,
      geoBreakdown,
      recommendations: [...new Set(recommendations)], // deduplicate
    }
  }

  // ─── 10. Score Content ──────────────────────────────────────────────────────
  scoreContent(markdown: string, keyword: string, language: string): ScoreResult {
    const text = markdown
    const lowerText = text.toLowerCase()
    const lowerKeyword = keyword.toLowerCase()

    const breakdown: ScoreBreakdownItem[] = []

    // ── SEO CRITERIA ────────────────────────────────────────────────────────

    // 1. KEYWORD_USAGE (25p)
    {
      const MAX = 25
      let score = 0
      const words = lowerText.split(/\s+/).filter(Boolean)
      const kwCount = words.filter((w) => w.includes(lowerKeyword)).length
      const density = words.length > 0 ? kwCount / words.length : 0

      // Keyword appears in text at all: up to 10p
      if (kwCount > 0) score += 10
      // Density 1-2%: 10p, outside range: partial
      if (density >= 0.01 && density <= 0.02) {
        score += 10
      } else if (density > 0 && density < 0.03) {
        score += 5
      }
      // Keyword in H1 (# line): 5p
      const h1Line = text.split('\n').find((l) => /^#\s/.test(l)) ?? ''
      if (h1Line.toLowerCase().includes(lowerKeyword)) score += 5

      breakdown.push({
        criterion: 'KEYWORD_USAGE',
        score: Math.min(score, MAX),
        maxScore: MAX,
        note: `Keyword count: ${kwCount}, density: ${(density * 100).toFixed(2)}%`,
      })
    }

    // 2. HEADING_STRUCTURE (15p)
    {
      const MAX = 15
      let score = 0
      const lines = text.split('\n')
      const h1s = lines.filter((l) => /^#\s/.test(l))
      const h2s = lines.filter((l) => /^##\s/.test(l))
      const h3s = lines.filter((l) => /^###\s/.test(l))

      if (h1s.length === 1) score += 5
      if (h2s.length >= 2) score += 7
      else if (h2s.length === 1) score += 3
      if (h3s.length >= 1) score += 3

      breakdown.push({
        criterion: 'HEADING_STRUCTURE',
        score: Math.min(score, MAX),
        maxScore: MAX,
        note: `H1: ${h1s.length}, H2: ${h2s.length}, H3: ${h3s.length}`,
      })
    }

    // 3. META (15p)
    {
      const MAX = 15
      // META scoring happens at item level; markdown usually contains a meta block
      // Look for front matter or <!-- meta --> style comments
      const metaTitleMatch = text.match(/meta[_-]?title:\s*["']?(.+?)["']?\n/i)
      const metaDescMatch = text.match(/meta[_-]?description:\s*["']?(.+?)["']?\n/i)
      let score = 0

      if (metaTitleMatch) {
        const mt = metaTitleMatch[1].trim()
        if (mt.length <= 60) score += 5
        if (mt.toLowerCase().includes(lowerKeyword)) score += 5
      }
      if (metaDescMatch) {
        const md = metaDescMatch[1].trim()
        if (md.length <= 155) score += 3
        if (md.toLowerCase().includes(lowerKeyword)) score += 2
      }

      breakdown.push({
        criterion: 'META',
        score: Math.min(score, MAX),
        maxScore: MAX,
        note: metaTitleMatch ? 'Meta fields detected in markdown' : 'No meta fields found in markdown',
      })
    }

    // 4. INTERNAL_LINKS (10p)
    {
      const MAX = 10
      const relativeLinks = [...text.matchAll(/\[([^\]]+)\]\(\/[^)]+\)/g)]
      const count = relativeLinks.length
      const score = count >= 3 ? 10 : count === 2 ? 7 : count === 1 ? 4 : 0

      breakdown.push({
        criterion: 'INTERNAL_LINKS',
        score,
        maxScore: MAX,
        note: `${count} relative internal link(s) found`,
      })
    }

    // 5. SCHEMA (10p)
    {
      const MAX = 10
      const hasJsonLd =
        /"@context"\s*:\s*"https?:\/\/schema\.org"/.test(text) ||
        /```json/.test(text)
      const score = hasJsonLd ? 10 : 0

      breakdown.push({
        criterion: 'SCHEMA',
        score,
        maxScore: MAX,
        note: hasJsonLd ? 'JSON-LD schema block detected' : 'No schema markup found',
      })
    }

    // 6. ENTITY_COVERAGE (10p)
    {
      const MAX = 10
      // Simple heuristic: count capitalised noun phrases (Title Case words not at sentence start)
      const nounPhrases = new Set(
        [...text.matchAll(/(?<!\.\s)(?<!\n)([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/g)].map(
          (m) => m[1],
        ),
      )
      const count = nounPhrases.size
      const score = count >= 5 ? 10 : count >= 3 ? 7 : count >= 1 ? 4 : 0

      breakdown.push({
        criterion: 'ENTITY_COVERAGE',
        score,
        maxScore: MAX,
        note: `${count} unique named entity phrase(s) detected`,
      })
    }

    // 7. ANSWER_FIRST (10p)
    {
      const MAX = 10
      const first100Words = lowerText.split(/\s+/).slice(0, 100).join(' ')
      // A direct answer: short declarative sentence (subject + verb + object, ending in period, < 20 words)
      const sentences = first100Words.split(/[.!?]/).filter(Boolean)
      const hasDirectAnswer = sentences.some((s) => {
        const wordCount = s.trim().split(/\s+/).length
        return wordCount >= 5 && wordCount <= 20
      })
      const score = hasDirectAnswer ? 10 : 0

      breakdown.push({
        criterion: 'ANSWER_FIRST',
        score,
        maxScore: MAX,
        note: hasDirectAnswer
          ? 'Direct answer detected in first 100 words'
          : 'No concise direct answer in opening',
      })
    }

    // 8. READABILITY (5p)
    {
      const MAX = 5
      const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0)
      const avgWordsPerSentence =
        sentences.length > 0
          ? sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) /
            sentences.length
          : 999

      const score = avgWordsPerSentence <= 20 ? 5 : avgWordsPerSentence <= 25 ? 3 : 1

      breakdown.push({
        criterion: 'READABILITY',
        score,
        maxScore: MAX,
        note: `Average sentence length: ${avgWordsPerSentence.toFixed(1)} words`,
      })
    }

    const seoScore = breakdown.reduce((acc, b) => acc + b.score, 0)

    // ── GEO CRITERIA ────────────────────────────────────────────────────────

    // 1. answer_first (30p)
    {
      const MAX = 30
      const firstParagraph = text.split(/\n\n/)[0] ?? ''
      const sentences = firstParagraph
        .split(/[.!?]/)
        .filter((s) => s.trim().length > 0)
      const hasAnswer = sentences.some((s) => {
        const wc = s.trim().split(/\s+/).length
        return wc >= 5 && wc <= 30
      })
      const score = hasAnswer ? 30 : firstParagraph.length > 50 ? 15 : 0

      breakdown.push({
        criterion: 'answer_first',
        score,
        maxScore: MAX,
        note: hasAnswer
          ? 'First paragraph contains a clear answer'
          : 'First paragraph lacks a direct answer',
      })
    }

    // 2. entity_clarity (25p)
    {
      const MAX = 25
      // Entities defined: "X is ..." or "X, a/an ..."
      const definitionPatterns = [
        /[A-Z][a-zA-Z]+\s+is\s+/g,
        /[A-Z][a-zA-Z]+,\s+(?:a|an|the)\s+/g,
        /[A-Z][a-zA-Z]+\s+refers\s+to\s+/gi,
      ]
      let definitionCount = 0
      for (const pattern of definitionPatterns) {
        definitionCount += [...text.matchAll(pattern)].length
      }
      const score = definitionCount >= 3 ? 25 : definitionCount === 2 ? 18 : definitionCount === 1 ? 10 : 0

      breakdown.push({
        criterion: 'entity_clarity',
        score,
        maxScore: MAX,
        note: `${definitionCount} entity definition pattern(s) found`,
      })
    }

    // 3. structured_data (20p)
    {
      const MAX = 20
      const hasSchema = /"@context"\s*:\s*"https?:\/\/schema\.org"/.test(text)
      const hasFaqSchema = /"@type"\s*:\s*"FAQPage"/.test(text)
      let score = 0
      if (hasSchema) score += 12
      if (hasFaqSchema) score += 8

      breakdown.push({
        criterion: 'structured_data',
        score: Math.min(score, MAX),
        maxScore: MAX,
        note: `Schema: ${hasSchema}, FAQPage: ${hasFaqSchema}`,
      })
    }

    // 4. citation_worthy (15p)
    {
      const MAX = 15
      // Statistics: numbers with %, figures, or sourced quotes
      const statsPattern = /\b\d+(?:\.\d+)?%|\b\d{4}\b|\baccording\s+to\b|\bstudy\b|\bresearch\b/gi
      const statsCount = [...text.matchAll(statsPattern)].length
      const score = statsCount >= 5 ? 15 : statsCount >= 3 ? 10 : statsCount >= 1 ? 5 : 0

      breakdown.push({
        criterion: 'citation_worthy',
        score,
        maxScore: MAX,
        note: `${statsCount} statistic/citation indicator(s) found`,
      })
    }

    // 5. question_format (10p)
    {
      const MAX = 10
      const lines = text.split('\n')
      const questionHeadings = lines.filter((l) => /^#{2,3}\s.*\?/.test(l))
      const hasFaqSection = /##\s*(?:FAQ|Sık Sorulan Sorular|Frequently Asked)/i.test(text)
      let score = 0
      if (questionHeadings.length >= 2) score += 6
      else if (questionHeadings.length === 1) score += 3
      if (hasFaqSection) score += 4

      breakdown.push({
        criterion: 'question_format',
        score: Math.min(score, MAX),
        maxScore: MAX,
        note: `${questionHeadings.length} question heading(s), FAQ section: ${hasFaqSection}`,
      })
    }

    const geoBreakdown = breakdown.filter((b) =>
      ['answer_first', 'entity_clarity', 'structured_data', 'citation_worthy', 'question_format'].includes(
        b.criterion,
      ),
    )
    const geoScore = geoBreakdown.reduce((acc, b) => acc + b.score, 0)

    return { seoScore, geoScore, breakdown }
  }
}
