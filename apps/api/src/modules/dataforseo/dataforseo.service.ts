import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SerpResult {
  type: string;
  rank_group: number;
  rank_absolute: number;
  domain: string;
  title: string;
  description: string;
  url: string;
  breadcrumb?: string;
  xpath?: string;
}

export interface KeywordResearchResult {
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  intent: string | null;
  competition: number | null;
}

export interface BacklinkProfile {
  domain_rank: number;
  backlinks_num: number;
  referring_domains: number;
  dofollow: number;
  nofollow: number;
  sample: Array<{
    url_from: string;
    url_to: string;
    domain_from: string;
    rank: number;
    is_dofollow: boolean;
    anchor: string;
  }>;
}

export interface LlmMentionResult {
  query: string;
  platform: string;
  mentioned: boolean;
  cited: boolean;
  snippet?: string;
  sources?: string[];
}

export interface AiModeResult {
  query: string;
  ai_answer?: string;
  cited_urls?: string[];
  organic_results?: SerpResult[];
}

export interface RelatedKeyword {
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
}

export interface CompetitorAnalysisResult {
  competitor: string;
  common_keywords: number;
  unique_to_competitor: number;
  avg_position: number | null;
  top_pages: Array<{
    url: string;
    keywords_count: number;
    traffic_share: number;
  }>;
}

@Injectable()
export class DataForSeoService {
  private readonly logger = new Logger(DataForSeoService.name);
  private readonly http: AxiosInstance;
  private readonly sandboxMode: boolean;

  constructor(private readonly config: ConfigService) {
    const login = config.get<string>('DATAFORSEO_LOGIN', '');
    const password = config.get<string>('DATAFORSEO_PASSWORD', '');
    this.sandboxMode = config.get<string>('DATAFORSEO_USE_SANDBOX', 'false') === 'true';

    const baseURL = this.sandboxMode
      ? 'https://sandbox.dataforseo.com/v3'
      : 'https://api.dataforseo.com/v3';

    this.http = axios.create({
      baseURL,
      auth: { username: login, password },
      timeout: 60_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── SERP Results ────────────────────────────────────────────────────────────

  async searchSerp(
    keyword: string,
    location: string,
    languageCode: string,
    depth = 10,
  ): Promise<SerpResult[]> {
    const locationCode = this.resolveLocationCode(location);

    const response = await this.request<{
      tasks: Array<{
        result?: Array<{
          items?: SerpResult[];
        }>;
      }>;
    }>('/serp/google/organic/live/advanced', [
      {
        keyword,
        location_code: locationCode,
        language_code: languageCode,
        depth,
        se_domain: 'google.com.tr',
        device: 'desktop',
        os: 'windows',
      },
    ]);

    return response.tasks?.[0]?.result?.[0]?.items ?? [];
  }

  // ─── Keyword Research ────────────────────────────────────────────────────────

  async keywordResearch(
    keywords: string[],
    location: string,
  ): Promise<KeywordResearchResult[]> {
    const locationCode = this.resolveLocationCode(location);

    const response = await this.request<{
      tasks: Array<{
        result?: Array<Record<string, unknown>>;
      }>;
    }>('/keywords_data/google_ads/keywords_for_keywords/live', [
      {
        keywords,
        location_code: locationCode,
        language_code: 'tr',
      },
    ]);

    const raw = response.tasks?.[0]?.result ?? [];
    return raw.map((item) => ({
      keyword: item['keyword'] as string,
      search_volume: (item['search_volume'] as number) ?? null,
      keyword_difficulty: (item['keyword_difficulty'] as number) ?? null,
      cpc: (item['cpc'] as number) ?? null,
      intent: (item['keyword_intent'] as { label?: string } | null)?.label ?? null,
      competition: (item['competition'] as number) ?? null,
    }));
  }

  // ─── Backlinks ───────────────────────────────────────────────────────────────

  async getBacklinks(domain: string): Promise<BacklinkProfile> {
    const response = await this.request<{
      tasks: Array<{
        result?: Array<{
          domain_rank?: number;
          backlinks?: number;
          referring_domains?: number;
          dofollow?: number;
          nofollow?: number;
          items?: BacklinkProfile['sample'];
        }>;
      }>;
    }>('/backlinks/summary/live', [
      {
        target: domain,
        limit: 50,
        include_subdomains: true,
      },
    ]);

    const result = response.tasks?.[0]?.result?.[0];
    if (!result) {
      return { domain_rank: 0, backlinks_num: 0, referring_domains: 0, dofollow: 0, nofollow: 0, sample: [] };
    }

    return {
      domain_rank: result.domain_rank ?? 0,
      backlinks_num: result.backlinks ?? 0,
      referring_domains: result.referring_domains ?? 0,
      dofollow: result.dofollow ?? 0,
      nofollow: result.nofollow ?? 0,
      sample: result.items ?? [],
    };
  }

  // ─── LLM Mentions (GEO) ──────────────────────────────────────────────────────

  async getLlmMentions(
    brand: string,
    queries: string[],
  ): Promise<LlmMentionResult[]> {
    const tasks = queries.map((q) => ({
      keyword: q,
      language_code: 'tr',
      location_code: 2792,
    }));

    const response = await this.request<{
      tasks: Array<{
        result?: Array<{
          keyword?: string;
          items?: Array<{
            type: string;
            text?: string;
            sources?: Array<{ url: string }>;
          }>;
        }>;
      }>;
    }>('/serp/google/ai_overview/live', tasks);

    return (response.tasks ?? []).map((task, idx) => {
      const result = task.result?.[0];
      const aiItem = result?.items?.find((i) => i.type === 'ai_overview');
      const text = aiItem?.text ?? '';
      const sources = aiItem?.sources?.map((s) => s.url) ?? [];

      const brandLower = brand.toLowerCase();
      const mentioned = text.toLowerCase().includes(brandLower);
      const cited = sources.some((u) => u.toLowerCase().includes(brandLower));

      return {
        query: queries[idx],
        platform: 'GOOGLE_AI_OVERVIEW',
        mentioned,
        cited,
        snippet: text.substring(0, 300),
        sources,
      };
    });
  }

  // ─── Google AI Mode SERP ─────────────────────────────────────────────────────

  async getAiModeSerp(query: string): Promise<AiModeResult> {
    const response = await this.request<{
      tasks: Array<{
        result?: Array<{
          keyword?: string;
          items?: Array<{
            type: string;
            text?: string;
            sources?: Array<{ url: string }>;
            url?: string;
            title?: string;
            description?: string;
          }>;
        }>;
      }>;
    }>('/serp/google/ai_overview/live', [
      {
        keyword: query,
        language_code: 'tr',
        location_code: 2792,
      },
    ]);

    const result = response.tasks?.[0]?.result?.[0];
    if (!result) {
      return { query };
    }

    const aiItem = result.items?.find((i) => i.type === 'ai_overview');
    const organic = result.items
      ?.filter((i) => i.type === 'organic')
      .map((i) => ({
        type: i.type,
        rank_group: 0,
        rank_absolute: 0,
        domain: i.url ? new URL(i.url).hostname : '',
        title: i.title ?? '',
        description: i.description ?? '',
        url: i.url ?? '',
      })) ?? [];

    return {
      query,
      ai_answer: aiItem?.text,
      cited_urls: aiItem?.sources?.map((s) => s.url),
      organic_results: organic,
    };
  }

  // ─── Related Keywords ─────────────────────────────────────────────────────────

  async getRelatedKeywords(seed: string): Promise<RelatedKeyword[]> {
    const response = await this.request<{
      tasks: Array<{
        result?: RelatedKeyword[];
      }>;
    }>('/keywords_data/google_ads/keywords_for_keywords/live', [
      {
        keywords: [seed],
        location_code: 2792,
        language_code: 'tr',
        limit: 50,
      },
    ]);

    return response.tasks?.[0]?.result ?? [];
  }

  // ─── Competitor Analysis ──────────────────────────────────────────────────────

  async competitorAnalysis(
    domain: string,
    competitors: string[],
  ): Promise<CompetitorAnalysisResult[]> {
    const results: CompetitorAnalysisResult[] = [];

    for (const competitor of competitors) {
      const response = await this.request<{
        tasks: Array<{
          result?: Array<{
            intersections?: number;
            items?: Array<{ url: string; keywords_count?: number; traffic_share?: number }>;
          }>;
        }>;
      }>('/dataforseo_labs/google/competitors_domain/live', [
        {
          target: domain,
          competitor: competitor,
          location_code: 2792,
          language_code: 'tr',
          limit: 10,
        },
      ]);

      const result = response.tasks?.[0]?.result?.[0];

      results.push({
        competitor,
        common_keywords: result?.intersections ?? 0,
        unique_to_competitor: 0,
        avg_position: null,
        top_pages:
          result?.items?.map((i) => ({
            url: i.url,
            keywords_count: i.keywords_count ?? 0,
            traffic_share: i.traffic_share ?? 0,
          })) ?? [],
      });
    }

    return results;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────────

  private async request<T>(endpoint: string, tasks: unknown[]): Promise<T> {
    try {
      const response = await this.http.post<T>(endpoint, tasks);
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`DataForSEO request to ${endpoint} failed: ${message}`);
      throw new InternalServerErrorException(
        `DataForSEO API error: ${message}`,
      );
    }
  }

  private resolveLocationCode(location: string): number {
    const map: Record<string, number> = {
      Turkey: 2792,
      'United States': 2840,
      'United Kingdom': 2826,
      Germany: 2276,
      France: 2250,
    };
    return map[location] ?? 2792;
  }
}
