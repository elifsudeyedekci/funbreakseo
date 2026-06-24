import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type SentimentResult = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface GenerateContentOptions {
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface BlogPostOptions {
  keyword: string;
  outline?: string[];
  tone?: string;
  language?: string;
}

export interface EmailCopyOptions {
  prospectDomain: string;
  targetUrl: string;
  topic?: string;
}

export interface MetaTagsResult {
  metaTitle: string;
  metaDescription: string;
}

export interface JsonLdResult {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly anthropic: Anthropic;
  private readonly openai: OpenAI;
  private readonly defaultAnthropicModel: string;
  private readonly defaultOpenAiModel: string;

  constructor(private readonly config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });

    this.openai = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
    });

    this.defaultAnthropicModel = config.get<string>(
      'LLM_DEFAULT_MODEL',
      'claude-3-5-sonnet-20241022',
    );

    this.defaultOpenAiModel = config.get<string>(
      'OPENAI_DEFAULT_MODEL',
      'gpt-4o',
    );
  }

  // ─── Generic content generation ───────────────────────────────────────────────

  async generateContent(options: GenerateContentOptions): Promise<string> {
    const { prompt, model, maxTokens = 4096 } = options;

    try {
      const message = await this.anthropic.messages.create({
        model: model ?? this.defaultAnthropicModel,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      const block = message.content[0];
      if (block.type !== 'text') {
        throw new InternalServerErrorException('Unexpected response type from Claude');
      }
      return block.text;
    } catch (err: unknown) {
      this.logger.warn('Claude failed, falling back to OpenAI', err);
      return this.generateContentOpenAi(prompt, maxTokens);
    }
  }

  // ─── Blog post generation ─────────────────────────────────────────────────────

  async generateBlogPost(options: BlogPostOptions): Promise<string> {
    const { keyword, outline, tone = 'professional', language = 'tr' } = options;

    const outlineSection =
      outline && outline.length > 0
        ? `\n\nMakale taslağı:\n${outline.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
        : '';

    const langInstruction =
      language === 'tr'
        ? 'Makaleyi Türkçe olarak yaz.'
        : `Write the article in ${language}.`;

    const prompt = `${langInstruction}

Sen bir uzman SEO içerik yazarısın. Aşağıdaki odak kelime için kapsamlı, SEO uyumlu bir blog yazısı oluştur.

Odak Kelime: ${keyword}
Ton: ${tone}${outlineSection}

Gereksinimler:
- H1, H2, H3 başlıkları içeren yapılandırılmış Markdown formatında yaz
- Odak kelimeyi doğal olarak kullan (tıkılma kaçırmadan)
- En az 1500 kelime
- FAQ bölümü ekle
- Sonuç bölümü ekle
- Schema.org uyumlu olacak şekilde yap
- E-E-A-T ilkelerine uy (Deneyim, Uzmanlık, Otorite, Güvenilirlik)`;

    return this.generateContent({ prompt, maxTokens: 8192 });
  }

  // ─── Outreach email copy ──────────────────────────────────────────────────────

  async generateEmailCopy(options: EmailCopyOptions): Promise<string> {
    const { prospectDomain, targetUrl, topic = 'SEO işbirliği' } = options;

    const prompt = `Write a professional, personalized outreach email in English for link building.

Prospect website: ${prospectDomain}
My target URL: ${targetUrl}
Topic/purpose: ${topic}

Requirements:
- Concise (under 150 words)
- Mention something specific about their site (use {SPECIFIC_DETAIL} as placeholder)
- Explain mutual benefit
- Clear call to action
- Natural, not spammy tone
- Subject line on first line prefixed with "Subject: "

Return only the email text including subject line.`;

    return this.generateContent({ prompt, maxTokens: 512 });
  }

  // ─── Classify outreach reply ──────────────────────────────────────────────────

  async classifyReply(replyText: string): Promise<string> {
    const prompt = `Classify the following email reply into exactly one of these categories:
INTERESTED | NOT_INTERESTED | QUESTION | NEGOTIATION | AUTO_REPLY

Reply text:
"""
${replyText}
"""

Return ONLY the category name, nothing else.`;

    const result = await this.generateContent({ prompt, maxTokens: 20 });
    const classification = result.trim().toUpperCase();

    const valid = [
      'INTERESTED',
      'NOT_INTERESTED',
      'QUESTION',
      'NEGOTIATION',
      'AUTO_REPLY',
    ];

    return valid.includes(classification) ? classification : 'AUTO_REPLY';
  }

  // ─── Meta tags ────────────────────────────────────────────────────────────────

  async generateMetaTags(
    title: string,
    keyword: string,
    description?: string,
  ): Promise<MetaTagsResult> {
    const prompt = `Generate SEO-optimized meta title and meta description for the following page.

Page title: ${title}
Focus keyword: ${keyword}
${description ? `Page description: ${description}` : ''}

Requirements:
- Meta title: max 60 characters, include keyword near start
- Meta description: 150-160 characters, include keyword, compelling CTA

Respond in this exact JSON format:
{
  "metaTitle": "...",
  "metaDescription": "..."
}`;

    const raw = await this.generateContent({ prompt, maxTokens: 256 });
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]) as MetaTagsResult;
    } catch {
      // Fallback
      return {
        metaTitle: `${keyword} | ${title}`.substring(0, 60),
        metaDescription: description
          ? description.substring(0, 160)
          : `${keyword} hakkında kapsamlı rehber. ${title}`.substring(0, 160),
      };
    }
  }

  // ─── JSON-LD Schema ───────────────────────────────────────────────────────────

  async generateJsonLd(
    type: string,
    data: Record<string, unknown>,
  ): Promise<JsonLdResult> {
    const prompt = `Generate valid Schema.org JSON-LD markup for type "${type}".

Input data:
${JSON.stringify(data, null, 2)}

Requirements:
- Valid JSON-LD format
- Include @context and @type
- Follow Schema.org specification for ${type}
- No comments, pure JSON only

Return only the JSON object.`;

    const raw = await this.generateContent({ prompt, maxTokens: 1024 });
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]) as JsonLdResult;
    } catch {
      return {
        '@context': 'https://schema.org',
        '@type': type,
        ...data,
      };
    }
  }

  // ─── Sentiment analysis ───────────────────────────────────────────────────────

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const prompt = `Analyze the sentiment of the following text and classify it as exactly one of:
POSITIVE | NEUTRAL | NEGATIVE

Text:
"""
${text}
"""

Return ONLY the sentiment label, nothing else.`;

    const result = await this.generateContent({ prompt, maxTokens: 20 });
    const sentiment = result.trim().toUpperCase() as SentimentResult;

    if (['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(sentiment)) {
      return sentiment;
    }
    return 'NEUTRAL';
  }

  // ─── OpenAI fallback ─────────────────────────────────────────────────────────

  private async generateContentOpenAi(
    prompt: string,
    maxTokens: number,
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.defaultOpenAiModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new InternalServerErrorException('Empty response from OpenAI');
    }
    return content;
  }
}
