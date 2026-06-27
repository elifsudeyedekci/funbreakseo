import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma.service'
import { ContentStatus } from '@prisma/client'
import axios from 'axios'
import { ConfigService } from '@nestjs/config'

// ─── Local scoring types ─────────────────────────────────────────────────────
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

// ─── Worker ──────────────────────────────────────────────────────────────────
@Injectable()
@Processor('content')
export class ContentWorker extends WorkerHost {
  private readonly logger = new Logger(ContentWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super()
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type "${job.name}"`)

    switch (job.name) {
      case 'generate':
        await this.handleGenerate(job)
        break
      case 'regenerate-section':
        await this.handleRegenerateSection(job)
        break
      default:
        this.logger.warn(`Unknown job type: ${job.name}`)
    }
  }

  // ─── GENERATE ─────────────────────────────────────────────────────────────
  private async handleGenerate(job: Job): Promise<void> {
    const { contentItemId, dto } = job.data as {
      contentItemId: string
      dto: {
        title: string
        focusKeyword: string
        type: string
        secondaryKeywords?: string[]
        language?: string
        tone?: string
      }
    }

    try {
      // ── Step 1: SERP Analysis via DataForSEO ────────────────────────────
      let serpContext = ''
      try {
        const login = process.env.DATAFORSEO_LOGIN
        const password = process.env.DATAFORSEO_PASSWORD
        const language = dto.language ?? 'tr'

        if (login && password) {
          const serpResponse = await axios.post(
            'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
            [
              {
                keyword: dto.focusKeyword,
                location_code: 2792,
                language_code: language,
                depth: 10,
              },
            ],
            {
              auth: { username: login, password },
              headers: { 'Content-Type': 'application/json' },
              timeout: 15000,
            },
          )

          const results =
            serpResponse.data?.tasks?.[0]?.result?.[0]?.items ?? []
          const topUrls = results
            .filter((item: any) => item.type === 'organic')
            .slice(0, 10)
            .map((item: any, i: number) => `${i + 1}. ${item.title} – ${item.url}`)
            .join('\n')

          if (topUrls) {
            serpContext = `\n\nTop 10 competitor pages for "${dto.focusKeyword}":\n${topUrls}\n`
          }
        }
      } catch (serpError: any) {
        this.logger.warn(`SERP analysis skipped: ${serpError.message}`)
      }

      // ── Step 2: Build content generation prompt ──────────────────────────
      const language = dto.language ?? 'tr'
      const tone = dto.tone ?? 'informative'
      const secondary = dto.secondaryKeywords?.join(', ') ?? ''

      const contentPrompt = `You are an expert SEO content writer. Write a comprehensive, optimised article in ${language === 'tr' ? 'Turkish' : language} language.

CONTENT DETAILS:
- Title: ${dto.title}
- Focus Keyword: ${dto.focusKeyword}
- Secondary Keywords: ${secondary || 'none'}
- Content Type: ${dto.type}
- Tone: ${tone}
${serpContext}

STRICT REQUIREMENTS:
1. Answer-First Format: Start with a clear, concise answer to the topic in the first paragraph (the "inverted pyramid" structure).
2. Structure: Use exactly one H1 heading, then 3–5 H2 headings, each with 1–2 H3 sub-sections where appropriate.
3. Keyword Usage: Use the focus keyword "${dto.focusKeyword}" naturally throughout — in H1, first paragraph, at least two H2s, and maintain 1–2% keyword density.
4. Entity Coverage: Mention related brands, organisations, places and concepts clearly; define them on first mention.
5. Internal Links: Add 2–3 internal link placeholders using the format [link text](/relevant-path).
6. FAQ Section: End with an "## FAQ" section containing 3–5 question-format H3 headings (###) with answers.
7. Statistics: Include at least 3 data points, percentages or cited facts (you may fabricate plausible examples for demonstration).
8. Length: 1000–1500 words.
9. JSON-LD: Do NOT include the schema in the markdown body; it will be added separately.

OUTPUT FORMAT:
Return ONLY valid Markdown. Do not include front matter or code fences around the whole document.`

      // ── Step 3: Call Claude API for main content ─────────────────────────
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

      const claudeResponse = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.config.get('DEFAULT_CONTENT_MODEL', 'claude-sonnet-4-6'),
          max_tokens: 4096,
          messages: [{ role: 'user', content: contentPrompt }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 120000,
        },
      )

      const bodyMarkdown: string =
        claudeResponse.data?.content?.[0]?.text ?? ''
      if (!bodyMarkdown) throw new Error('Claude returned empty content')

      const inputTokens: number = claudeResponse.data?.usage?.input_tokens ?? 0
      const outputTokens: number = claudeResponse.data?.usage?.output_tokens ?? 0
      // Rough cost estimate for claude-3-5-sonnet (USD per million tokens)
      const generationCost = (inputTokens * 3 + outputTokens * 15) / 1_000_000

      // ── Step 4: Generate meta title and meta description ─────────────────
      const metaPrompt = `Given the following article, generate:
1. A meta title (max 60 characters, must include the keyword "${dto.focusKeyword}")
2. A meta description (max 155 characters, must include the keyword "${dto.focusKeyword}")

Article title: ${dto.title}

First 200 words of article:
${bodyMarkdown.slice(0, 800)}

Respond in this exact JSON format (no markdown fences):
{"metaTitle": "...", "metaDescription": "..."}`

      const metaResponse = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.config.get('DEFAULT_CONTENT_MODEL', 'claude-sonnet-4-6'),
          max_tokens: 300,
          messages: [{ role: 'user', content: metaPrompt }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 30000,
        },
      )

      let metaTitle = dto.title.slice(0, 60)
      let metaDescription = `${dto.focusKeyword} hakkında kapsamlı rehber.`.slice(0, 155)

      try {
        const metaText: string = metaResponse.data?.content?.[0]?.text ?? '{}'
        const metaJson = JSON.parse(metaText.trim())
        if (metaJson.metaTitle) metaTitle = String(metaJson.metaTitle).slice(0, 60)
        if (metaJson.metaDescription) metaDescription = String(metaJson.metaDescription).slice(0, 155)
      } catch {
        this.logger.warn('Failed to parse meta JSON, using fallback values')
      }

      // ── Step 5: Generate JSON-LD schemas ──────────────────────────────────
      const lines = bodyMarkdown.split('\n')
      const h1Line = lines.find((l) => /^#\s/.test(l)) ?? dto.title
      const h1Text = h1Line.replace(/^#\s+/, '').trim()

      const articleSchema: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: h1Text.slice(0, 110),
        description: metaDescription,
        keywords: [dto.focusKeyword, ...(dto.secondaryKeywords ?? [])].join(', '),
        inLanguage: language,
        author: { '@type': 'Organization', name: 'FunBreakSEO' },
        publisher: { '@type': 'Organization', name: 'FunBreakSEO' },
      }

      const schemas: Record<string, any>[] = [articleSchema]

      // Detect FAQ section and build FAQPage schema
      const hasFaqSection = /^##\s*(FAQ|Sık Sorulan|Frequently Asked)/im.test(bodyMarkdown)
      if (hasFaqSection) {
        const faqItems: Array<{ question: string; answer: string }> = []
        const h3Questions = [...bodyMarkdown.matchAll(/^###\s+(.+\?)\s*\n([\s\S]*?)(?=\n###|\n##|$)/gm)]

        for (const match of h3Questions.slice(0, 10)) {
          const question = match[1].trim()
          const answer = match[2].trim().replace(/\n+/g, ' ').slice(0, 300)
          if (question && answer) faqItems.push({ question, answer })
        }

        if (faqItems.length > 0) {
          schemas.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          })
        }
      }

      const jsonLd = schemas.length === 1 ? schemas[0] : schemas

      // ── Step 6: Extract structural data ──────────────────────────────────
      const h2Lines = lines.filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s+/, '').trim())
      const headingsOutline = h2Lines.map((h2) => ({ h2, h3s: [] as string[] }))

      // Attach H3s to their parent H2
      let currentH2Idx = -1
      for (const line of lines) {
        if (/^##\s/.test(line)) {
          currentH2Idx++
        } else if (/^###\s/.test(line) && currentH2Idx >= 0) {
          headingsOutline[currentH2Idx]?.h3s.push(line.replace(/^###\s+/, '').trim())
        }
      }

      // ── Step 7: Score the content ────────────────────────────────────────
      const hasFaqSchema = schemas.some((s) => s['@type'] === 'FAQPage')
      const scoreResult = scoreContent(bodyMarkdown, dto.focusKeyword, language, {
        metaTitle,
        metaDescription,
        hasSchema: schemas.length > 0,
        hasFaqSchema,
      })

      const wordCount = bodyMarkdown
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[#*`>\[\]]/g, '')
        .split(/\s+/)
        .filter(Boolean).length

      // ── Step 8: Update ContentItem ───────────────────────────────────────
      await this.prisma.contentItem.update({
        where: { id: contentItemId },
        data: {
          // Generated content goes straight to DRAFT — immediately viewable,
          // editable and publishable by the customer. No admin approval gate
          // (the approve flow stays available but is optional).
          status: ContentStatus.DRAFT,
          bodyMarkdown,
          wordCount,
          seoScore: scoreResult.seoScore,
          geoScore: scoreResult.geoScore,
          metaTitle,
          metaDescription,
          jsonLd,
          h1: h1Text,
          headingsOutline,
          aiModel: this.config.get('DEFAULT_CONTENT_MODEL', 'claude-sonnet-4-6'),
          generationCost,
        },
      })

      // ── Step 9: Save score breakdowns ────────────────────────────────────
      // Delete any previous breakdowns first
      await this.prisma.contentScoreBreakdown.deleteMany({
        where: { contentItemId },
      })

      await this.prisma.contentScoreBreakdown.createMany({
        data: scoreResult.breakdown.map((bd) => ({
          contentItemId,
          criterion: bd.criterion,
          score: bd.score,
          maxScore: bd.maxScore,
          note: bd.note,
        })),
      })

      this.logger.log(
        `Content generated for ${contentItemId}: SEO ${scoreResult.seoScore}, GEO ${scoreResult.geoScore}`,
      )
    } catch (error: any) {
      this.logger.error(`Generation failed for ${contentItemId}: ${error.message}`, error.stack)

      // Set status back to DRAFT and record the error as a revision note
      await this.prisma.contentItem.update({
        where: { id: contentItemId },
        data: { status: ContentStatus.DRAFT },
      })

      const current = await this.prisma.contentItem.findUnique({
        where: { id: contentItemId },
        include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
      })

      const nextVersion = (current?.revisions[0]?.version ?? 0) + 1

      await this.prisma.contentRevision.create({
        data: {
          contentItemId,
          version: nextVersion,
          bodyMarkdown: '',
          editedByUserId: current?.createdByUserId ?? '',
          note: `Generation failed: ${error.message}`,
        },
      })

      throw error // Re-throw so BullMQ marks the job as failed
    }
  }

  // ─── REGENERATE SECTION ───────────────────────────────────────────────────
  private async handleRegenerateSection(job: Job): Promise<void> {
    const { contentItemId, section, instructions } = job.data as {
      contentItemId: string
      section: string
      instructions?: string
    }

    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
    })

    if (!item) {
      this.logger.error(`ContentItem ${contentItemId} not found for regeneration`)
      return
    }

    const currentMarkdown = item.bodyMarkdown ?? ''

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

      // ── Build section rewrite prompt ────────────────────────────────────
      const sectionPrompt = `You are an expert SEO content editor. You need to rewrite a specific section of an article.

ARTICLE TITLE: ${item.title}
FOCUS KEYWORD: ${item.focusKeyword}
SECTION TO REWRITE: "${section}"
${instructions ? `ADDITIONAL INSTRUCTIONS: ${instructions}` : ''}

FULL ARTICLE (for context):
${currentMarkdown}

---

Rewrite ONLY the section titled "${section}". Keep the same markdown heading level.
Return ONLY the rewritten section content (including its heading), nothing else.`

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.config.get('DEFAULT_CONTENT_MODEL', 'claude-sonnet-4-6'),
          max_tokens: 1024,
          messages: [{ role: 'user', content: sectionPrompt }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 60000,
        },
      )

      const newSectionContent: string = response.data?.content?.[0]?.text ?? ''
      if (!newSectionContent) throw new Error('Claude returned empty section content')

      // ── Replace the section in the full markdown ──────────────────────
      // Match the section heading and its content up to the next same-or-higher level heading
      const headingLevelMatch = section.match(/^(#{1,6})\s/)
      const headingLevel = headingLevelMatch ? headingLevelMatch[1].length : 2
      const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const sectionRegex = new RegExp(
        `(${escapedSection}[\\s\\S]*?)(?=\\n#{1,${headingLevel}}\\s|$)`,
        'i',
      )

      let updatedMarkdown = currentMarkdown
      if (sectionRegex.test(currentMarkdown)) {
        updatedMarkdown = currentMarkdown.replace(sectionRegex, newSectionContent + '\n\n')
      } else {
        // Section heading not found exactly – append the rewrite
        updatedMarkdown = `${currentMarkdown}\n\n${newSectionContent}`
      }

      // ── Save revision of old content ────────────────────────────────────
      const nextVersion = (item.revisions[0]?.version ?? 0) + 1

      await this.prisma.contentRevision.create({
        data: {
          contentItemId,
          version: nextVersion,
          bodyMarkdown: currentMarkdown,
          editedByUserId: item.createdByUserId ?? '',
          note: `Section regenerated: "${section}"${instructions ? ` – ${instructions}` : ''}`,
        },
      })

      // ── Re-score updated content ────────────────────────────────────────
      const jsonLdStr = item.jsonLd ? JSON.stringify(item.jsonLd) : ''
      const scoreResult = scoreContent(
        updatedMarkdown,
        item.focusKeyword ?? '',
        'tr',
        {
          metaTitle: item.metaTitle,
          metaDescription: item.metaDescription,
          hasSchema: Boolean(item.jsonLd),
          hasFaqSchema: jsonLdStr.includes('FAQPage'),
        },
      )

      const wordCount = updatedMarkdown
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[#*`>\[\]]/g, '')
        .split(/\s+/)
        .filter(Boolean).length

      // ── Persist updated content ─────────────────────────────────────────
      await this.prisma.contentItem.update({
        where: { id: contentItemId },
        data: {
          bodyMarkdown: updatedMarkdown,
          wordCount,
          seoScore: scoreResult.seoScore,
          geoScore: scoreResult.geoScore,
        },
      })

      // Update score breakdowns
      await this.prisma.contentScoreBreakdown.deleteMany({
        where: { contentItemId },
      })

      await this.prisma.contentScoreBreakdown.createMany({
        data: scoreResult.breakdown.map((bd) => ({
          contentItemId,
          criterion: bd.criterion,
          score: bd.score,
          maxScore: bd.maxScore,
          note: bd.note,
        })),
      })

      this.logger.log(`Section "${section}" regenerated for content ${contentItemId}`)
    } catch (error: any) {
      this.logger.error(
        `Section regeneration failed for ${contentItemId}: ${error.message}`,
        error.stack,
      )

      // Record failure as a revision note; leave content untouched
      const nextVersion = (item.revisions[0]?.version ?? 0) + 1

      await this.prisma.contentRevision.create({
        data: {
          contentItemId,
          version: nextVersion,
          bodyMarkdown: currentMarkdown,
          editedByUserId: item.createdByUserId ?? '',
          note: `Section regeneration failed for "${section}": ${error.message}`,
        },
      })

      await this.prisma.contentItem.update({
        where: { id: contentItemId },
        data: { status: ContentStatus.DRAFT },
      })

      throw error
    }
  }
}

// ─── Standalone scoring function (mirrors ContentService.scoreContent) ───────
// `opts` carries the separately-generated artifacts (meta + schema) so META and
// SCHEMA criteria score against what the system ACTUALLY produces — these live in
// dedicated DB fields, not in the markdown body, so scanning the markdown alone
// always returned 0 and depressed the SEO score.
function scoreContent(
  markdown: string,
  keyword: string,
  language: string,
  opts: { metaTitle?: string | null; metaDescription?: string | null; hasSchema?: boolean; hasFaqSchema?: boolean } = {},
): ScoreResult {
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

    if (kwCount > 0) score += 10
    if (density >= 0.01 && density <= 0.02) score += 10
    else if (density > 0 && density < 0.03) score += 5

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

  // 3. META (15p) — score the actual generated meta fields, not the markdown.
  {
    const MAX = 15
    let score = 0
    const mt = (opts.metaTitle ?? '').trim()
    const md = (opts.metaDescription ?? '').trim()
    // Fallback: also accept meta embedded in markdown front-matter if present.
    const mtFallback = text.match(/meta[_-]?title:\s*["']?(.+?)["']?\n/i)?.[1]?.trim()
    const mdFallback = text.match(/meta[_-]?description:\s*["']?(.+?)["']?\n/i)?.[1]?.trim()
    const title = mt || mtFallback || ''
    const desc = md || mdFallback || ''

    if (title) {
      if (title.length >= 15 && title.length <= 60) score += 5
      else if (title.length > 0) score += 2
      if (title.toLowerCase().includes(lowerKeyword)) score += 5
    }
    if (desc) {
      if (desc.length >= 50 && desc.length <= 160) score += 3
      else if (desc.length > 0) score += 1
      if (desc.toLowerCase().includes(lowerKeyword)) score += 2
    }

    breakdown.push({
      criterion: 'META',
      score: Math.min(score, MAX),
      maxScore: MAX,
      note: title ? `Meta title (${title.length}c) + description (${desc.length}c)` : 'No meta generated',
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

  // 5. SCHEMA (10p) — JSON-LD is generated into a dedicated field, not the body.
  {
    const MAX = 10
    const hasJsonLd =
      (opts.hasSchema ?? false) ||
      /"@context"\s*:\s*"https?:\/\/schema\.org"/.test(text) ||
      /```json/.test(text)
    const score = hasJsonLd ? 10 : 0

    breakdown.push({
      criterion: 'SCHEMA',
      score,
      maxScore: MAX,
      note: hasJsonLd ? 'JSON-LD schema generated' : 'No schema markup',
    })
  }

  // 6. ENTITY_COVERAGE (10p)
  {
    const MAX = 10
    const nounPhrases = new Set(
      [...text.matchAll(/(?<!\.\s)(?<!\n)([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/g)].map((m) => m[1]),
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
    const sentences = firstParagraph.split(/[.!?]/).filter((s) => s.trim().length > 0)
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
    const definitionPatterns = [
      // English
      /[A-Z][a-zA-Z]+\s+is\s+/g,
      /[A-Z][a-zA-Z]+,\s+(?:a|an|the)\s+/g,
      /[A-Z][a-zA-Z]+\s+refers\s+to\s+/gi,
      // Turkish: "X bir ...", "X, ... ", "X olarak", "X demektir/denir", "X ise"
      /\b\p{Lu}[\p{L}]+\s+(?:bir|bu|şu)\s+/gu,
      /\b\p{Lu}[\p{L}]+\s+(?:olarak|demektir|denir|tanımlanır|anlamına gelir)\b/gu,
    ]
    let definitionCount = 0
    for (const pattern of definitionPatterns) {
      definitionCount += [...text.matchAll(pattern)].length
    }
    const score =
      definitionCount >= 3 ? 25 : definitionCount === 2 ? 18 : definitionCount === 1 ? 10 : 0

    breakdown.push({
      criterion: 'entity_clarity',
      score,
      maxScore: MAX,
      note: `${definitionCount} entity definition pattern(s) found`,
    })
  }

  // 3. structured_data (20p) — schema lives in a dedicated field.
  {
    const MAX = 20
    const hasSchema = (opts.hasSchema ?? false) || /"@context"\s*:\s*"https?:\/\/schema\.org"/.test(text)
    const hasFaqSchema = (opts.hasFaqSchema ?? false) || /"@type"\s*:\s*"FAQPage"/.test(text)
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
    const statsPattern =
      /%\s*\d+|\b\d+(?:[.,]\d+)?\s*%|\b\d{4}\b|\baccording\s+to\b|\bstudy\b|\bresearch\b|\bgöre\b|\baraştırma\b|\bçalışma\b|\bistatistik\b|\boran(?:ı|ında)?\b|\bverilerine\b/gi
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
