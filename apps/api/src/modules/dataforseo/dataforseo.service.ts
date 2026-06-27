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
  referring_main_domains: number;
  spam_score: number;
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

  private readonly baseURL: string;
  private readonly hasCreds: boolean;

  constructor(private readonly config: ConfigService) {
    const login = config.get<string>('DATAFORSEO_LOGIN', '');
    const password = config.get<string>('DATAFORSEO_PASSWORD', '');
    this.sandboxMode = config.get<string>('DATAFORSEO_USE_SANDBOX', 'false') === 'true';
    this.hasCreds = Boolean(login && password);

    this.baseURL = this.sandboxMode
      ? 'https://sandbox.dataforseo.com/v3'
      : 'https://api.dataforseo.com/v3';

    // Surface the effective configuration at startup. If production data looks
    // wrong while manual curl works, the usual cause is sandboxMode=true (the
    // app then hits sandbox.dataforseo.com which returns canned sample data) or
    // missing credentials. This log makes that immediately visible in PM2 logs.
    if (this.sandboxMode) {
      this.logger.warn(
        `DataForSEO running in SANDBOX mode (${this.baseURL}) — responses are CANNED SAMPLE DATA, not real. Set DATAFORSEO_USE_SANDBOX=false for live data.`,
      );
    } else {
      this.logger.log(`DataForSEO using PRODUCTION (${this.baseURL}), credentials ${this.hasCreds ? 'present' : 'MISSING'}`);
    }

    this.http = axios.create({
      baseURL: this.baseURL,
      auth: { username: login, password },
      timeout: 60_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Diagnostics: returns the effective config + a raw probe of the key endpoints
   * for a domain, so we can verify what the APP actually receives (vs manual
   * curl). Exposed via an admin diagnostics endpoint. Never throws.
   */
  async diagnose(domain: string): Promise<Record<string, unknown>> {
    const clean = this.normalizeDomain(domain);
    const out: Record<string, unknown> = {
      baseURL: this.baseURL,
      sandboxMode: this.sandboxMode,
      hasCredentials: this.hasCreds,
      domain: clean,
    };
    // Backlinks summary
    try {
      const r = await this.http.post('/backlinks/summary/live', [{ target: clean, include_subdomains: true }]);
      const t = (r.data as any)?.tasks?.[0];
      out.backlinksSummary = {
        status_code: t?.status_code,
        status_message: t?.status_message,
        backlinks: t?.result?.[0]?.backlinks,
        referring_domains: t?.result?.[0]?.referring_domains,
      };
    } catch (e) { out.backlinksSummary = { error: (e as Error).message }; }
    // Backlinks list count (as_is)
    try {
      const r = await this.http.post('/backlinks/backlinks/live', [{ target: clean, mode: 'as_is', limit: 100, include_subdomains: true }]);
      const res = (r.data as any)?.tasks?.[0]?.result?.[0];
      out.backlinksList = { total_count: res?.total_count, items_count: res?.items?.length, sample_item_keys: res?.items?.[0] ? Object.keys(res.items[0]) : [] };
    } catch (e) { out.backlinksList = { error: (e as Error).message }; }
    // Competitors domain
    try {
      const r = await this.http.post('/dataforseo_labs/google/competitors_domain/live', [{ target: clean, location_code: 2792, language_code: 'tr', limit: 10 }]);
      const res = (r.data as any)?.tasks?.[0]?.result?.[0];
      out.competitors = {
        status: (r.data as any)?.tasks?.[0]?.status_message,
        items_count: res?.items?.length,
        sample_item_keys: res?.items?.[0] ? Object.keys(res.items[0]) : [],
        first_three: (res?.items ?? []).slice(0, 3).map((i: any) => ({ domain: i.domain, intersections: i.intersections, avg_position: i.avg_position, metrics_keys: i.metrics ? Object.keys(i.metrics) : [] })),
      };
    } catch (e) { out.competitors = { error: (e as Error).message }; }
    // Ranked keywords
    try {
      const r = await this.http.post('/dataforseo_labs/google/ranked_keywords/live', [{ target: clean, location_code: 2792, language_code: 'tr', limit: 10 }]);
      const res = (r.data as any)?.tasks?.[0]?.result?.[0];
      out.rankedKeywords = { total_count: res?.total_count, items_count: res?.items?.length, sample_item_keys: res?.items?.[0] ? Object.keys(res.items[0]) : [] };
    } catch (e) { out.rankedKeywords = { error: (e as Error).message }; }
    return out;
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

  /**
   * Live SERP position for a single keyword. Returns the project domain's
   * rank_absolute (falling back to rank_group) among organic results, or null
   * when the domain does not rank. Always uses location_code 2792 + tr.
   */
  async getSerpPosition(
    keyword: string,
    targetDomain: string,
    languageCode = 'tr',
    locationCode = 2792,
  ): Promise<{ position: number | null; url: string | null }> {
    const target = this.normalizeDomain(targetDomain);
    const response = await this.request<{
      tasks: Array<{
        result?: Array<{
          items?: Array<{
            type?: string;
            rank_absolute?: number;
            rank_group?: number;
            domain?: string;
            url?: string;
          }>;
        }>;
      }>;
    }>('/serp/google/organic/live/advanced', [
      {
        keyword,
        location_code: locationCode,
        language_code: languageCode,
        depth: 100,
      },
    ]);

    const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
    const match = items.find(
      (i) =>
        i.type === 'organic' &&
        i.domain &&
        (this.normalizeDomain(i.domain).includes(target) ||
          target.includes(this.normalizeDomain(i.domain))),
    );
    if (!match) return { position: null, url: null };
    return {
      position: match.rank_absolute ?? match.rank_group ?? null,
      url: match.url ?? null,
    };
  }

  /**
   * Google AI Mode references for a keyword. Recursively walks every item /
   * nested item and collects ALL references[] entries ({ domain, source, url,
   * title }) into a flat list. This is where AI citations actually live —
   * not in items[].url. Always location_code 2792 + tr.
   */
  async getAiModeReferences(
    keyword: string,
    languageCode = 'tr',
    locationCode = 2792,
  ): Promise<{
    text: string;
    references: Array<{ domain: string; source: string; url: string; title: string }>;
  }> {
    const response = await this.request<{
      tasks: Array<{ result?: Array<{ items?: unknown[] }> }>;
    }>('/serp/google/ai_mode/live/advanced', [
      {
        keyword,
        location_code: locationCode,
        language_code: languageCode,
      },
    ]);

    const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
    const references: Array<{ domain: string; source: string; url: string; title: string }> = [];
    const texts: string[] = [];

    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      if (typeof obj['text'] === 'string') texts.push(obj['text'] as string);
      const refs = obj['references'];
      if (Array.isArray(refs)) {
        for (const r of refs) {
          if (r && typeof r === 'object') {
            const rr = r as Record<string, unknown>;
            const url = (rr['url'] as string) ?? '';
            const domain = (rr['domain'] as string) ?? (url ? this.safeHostname(url) : '');
            if (domain || url) {
              references.push({
                domain: this.normalizeDomain(domain || url),
                source: (rr['source'] as string) ?? '',
                url,
                title: (rr['title'] as string) ?? '',
              });
            }
          }
        }
      }
      // Recurse into nested item arrays
      const nested = obj['items'];
      if (Array.isArray(nested)) for (const c of nested) walk(c);
    };

    for (const it of items) walk(it);
    return { text: texts.join(' '), references };
  }

  // ─── Keyword Research ────────────────────────────────────────────────────────

  async keywordResearch(
    keywords: string[],
    location: string,
    languageCode = 'tr',
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
        language_code: languageCode,
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
        status_code?: number;
        status_message?: string;
        result?: Array<{
          domain_rank?: number;
          backlinks?: number;
          referring_domains?: number;
          referring_main_domains?: number;
          backlinks_spam_score?: number;
          dofollow?: number;
          nofollow?: number;
        }>;
      }>;
    }>('/backlinks/summary/live', [
      {
        target: domain,
        include_subdomains: true,
      },
    ]);

    const task = response.tasks?.[0];
    if (this.isSubscriptionError(task?.status_code, task?.status_message)) {
      throw new Error(`SUBSCRIPTION_REQUIRED: ${task?.status_message ?? 'backlinks subscription required'}`);
    }

    const result = task?.result?.[0];
    if (!result) {
      return { domain_rank: 0, backlinks_num: 0, referring_domains: 0, referring_main_domains: 0, spam_score: 0, dofollow: 0, nofollow: 0, sample: [] };
    }

    // summary/live does NOT return individual backlinks — fetch them separately
    const backlinks = await this.getBacklinkList(domain, 1000);
    this.logger.log(
      `Backlink summary for ${domain}: backlinks=${result.backlinks ?? 0} referring_domains=${result.referring_domains ?? 0} → ${backlinks.length} items fetched`,
    );

    return {
      domain_rank: result.domain_rank ?? 0,
      backlinks_num: result.backlinks ?? 0,
      referring_domains: result.referring_domains ?? 0,
      referring_main_domains: result.referring_main_domains ?? 0,
      spam_score: result.backlinks_spam_score ?? 0,
      dofollow: result.dofollow ?? 0,
      nofollow: result.nofollow ?? 0,
      sample: backlinks,
    };
  }

  async getBacklinkList(domain: string, limit = 100): Promise<BacklinkProfile['sample']> {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    try {
      const response = await this.request<{
        tasks: Array<{
          result?: Array<{
            items?: Array<{
              url_from?: string;
              url_to?: string;
              domain_from?: string;
              rank?: number;
              domain_from_rank?: number;
              page_from_rank?: number;
              backlink_spam_score?: number;
              dofollow?: boolean;
              is_broken?: boolean;
              anchor?: string;
              text_pre?: string;
              text_post?: string;
            }>;
          }>;
        }>;
      }>('/backlinks/backlinks/live', [
        {
          target: cleanDomain,
          limit,
          // mode "as_is" returns EVERY individual backlink. The default
          // (one_per_domain) collapses to ~1 row per referring domain, which is
          // why the list showed ~13 while summary reported 27.
          mode: 'as_is',
          include_subdomains: true,
          backlinks_status_type: 'live',
          broken_backlinks: false,
          broken_pages: false,
        },
      ]);

      const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
      return items.map((item) => ({
        url_from: item.url_from ?? '',
        url_to: item.url_to ?? '',
        domain_from: item.domain_from ?? '',
        // DR of the linking source. Prefer the source domain's authority
        // (domain_from_rank, 0-1000); fall back to page rank. Use a non-zero
        // preference so a present value always wins over a missing/0 field.
        rank: item.domain_from_rank || item.page_from_rank || item.rank || 0,
        is_dofollow: item.dofollow ?? true,
        anchor: item.anchor ?? '',
      }));
    } catch (err) {
      this.logger.warn(`getBacklinkList failed for ${domain}`, err);
      return [];
    }
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

  // ─── Bulk Keyword Difficulty ─────────────────────────────────────────────────

  async getBulkKeywordDifficulty(keywords: string[], locationCode = 2792, languageCode = 'tr'): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!keywords.length) return map;
    try {
      const response = await this.request<{
        tasks: Array<{
          result?: Array<{
            items?: Array<{ keyword?: string; keyword_difficulty?: number }>;
          }>;
        }>;
      }>('/dataforseo_labs/google/bulk_keyword_difficulty/live', [
        {
          keywords,
          location_code: locationCode,
          language_code: languageCode,
        },
      ]);
      const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
      for (const item of items) {
        if (item.keyword) map.set(item.keyword.toLowerCase(), item.keyword_difficulty ?? 0);
      }
    } catch (err) {
      this.logger.warn('getBulkKeywordDifficulty failed', err);
    }
    return map;
  }

  // ─── Related Keywords ─────────────────────────────────────────────────────────

  async getRelatedKeywords(seed: string, locationCode = 2792, languageCode = 'tr'): Promise<RelatedKeyword[]> {
    const response = await this.request<{
      tasks: Array<{
        result?: RelatedKeyword[];
      }>;
    }>('/keywords_data/google_ads/keywords_for_keywords/live', [
      {
        keywords: [seed],
        location_code: locationCode,
        language_code: languageCode,
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

  // ─── Keywords for Site (domain-based discovery) ──────────────────────────────

  async getKeywordsForSite(domain: string, limit = 50, locationCode = 2792, languageCode = 'tr'): Promise<RelatedKeyword[]> {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const response = await this.request<{
        tasks: Array<{ result?: Array<{ items?: Array<Record<string, unknown>> }> }>;
      }>('/dataforseo_labs/google/keywords_for_site/live', [{
        target: cleanDomain,
        location_code: locationCode,
        language_code: languageCode,
        limit,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
      }]);
      const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
      return items.map((item: any) => ({
        keyword: item.keyword as string,
        search_volume: (item.keyword_data?.keyword_info?.search_volume as number) ?? null,
        keyword_difficulty: (item.keyword_data?.keyword_properties?.keyword_difficulty as number) ?? null,
        cpc: (item.keyword_data?.keyword_info?.cpc as number) ?? null,
      })).filter((k: RelatedKeyword) => k.keyword);
    } catch (err) {
      this.logger.warn('getKeywordsForSite failed', err);
      return [];
    }
  }

  async getRankedKeywords(domain: string, limit = 50, locationCode = 2792, languageCode = 'tr'): Promise<RelatedKeyword[]> {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const response = await this.request<{
        tasks: Array<{ result?: Array<{ items?: Array<Record<string, unknown>> }> }>;
      }>('/dataforseo_labs/google/ranked_keywords/live', [{
        target: cleanDomain,
        location_code: locationCode,
        language_code: languageCode,
        limit,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
      }]);
      const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
      return items.map((item: any) => ({
        keyword: item.keyword_data?.keyword as string,
        search_volume: (item.keyword_data?.keyword_info?.search_volume as number) ?? null,
        keyword_difficulty: (item.keyword_data?.keyword_properties?.keyword_difficulty as number) ?? null,
        cpc: (item.keyword_data?.keyword_info?.cpc as number) ?? null,
      })).filter((k: RelatedKeyword) => k.keyword);
    } catch (err) {
      this.logger.warn('getRankedKeywords failed', err);
      return [];
    }
  }

  /**
   * Ranked keywords WITH the domain's live Google position for each keyword.
   * Used by the "fetch all ranked keywords" feature and competitor keyword
   * drill-down. Always location_code 2792 + tr.
   */
  async getRankedKeywordsDetailed(domain: string, limit = 100, locationCode = 2792, languageCode = 'tr'): Promise<Array<{
    keyword: string; position: number | null; searchVolume: number; difficulty: number; cpc: number; url: string | null;
  }>> {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const response = await this.request<{
        tasks: Array<{ result?: Array<{ items?: Array<Record<string, any>> }> }>;
      }>('/dataforseo_labs/google/ranked_keywords/live', [{
        target: cleanDomain,
        location_code: locationCode,
        language_code: languageCode,
        limit,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
      }]);
      const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
      return (items as any[])
        .map((item) => {
          const serp = item.ranked_serp_element?.serp_item;
          return {
            keyword: item.keyword_data?.keyword as string,
            position: serp?.rank_absolute ?? serp?.rank_group ?? null,
            searchVolume: item.keyword_data?.keyword_info?.search_volume ?? 0,
            difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty ?? 0,
            cpc: item.keyword_data?.keyword_info?.cpc ?? 0,
            url: serp?.url ?? serp?.relative_url ?? null,
          };
        })
        .filter((k) => k.keyword);
    } catch (err) {
      this.logger.warn('getRankedKeywordsDetailed failed', err);
      return [];
    }
  }

  // ─── Competitor domain discovery ─────────────────────────────────────────────

  async getCompetitorDomains(domain: string, limit = 10, locationCode = 2792, languageCode = 'tr'): Promise<Array<{
    domain: string; avgPosition: number | null; intersections: number; etv: number | null;
  }>> {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const response = await this.request<{
        tasks: Array<{ result?: Array<{ items?: Array<Record<string, unknown>> }> }>;
      }>('/dataforseo_labs/google/competitors_domain/live', [{
        target: cleanDomain,
        location_code: locationCode,
        language_code: languageCode,
        // NOTE: no order_by — an invalid order_by field makes the whole task
        // fail (status 40xxx) and we'd silently get nothing, leaving stale 0s.
        // The API already returns competitors by relevance; we sort in JS below.
        limit: Math.max(limit, 30),
      }]);
      const task = response.tasks?.[0] as any;
      const items = task?.result?.[0]?.items ?? [];
      if (items[0]) {
        this.logger.log(`competitors_domain raw item keys for ${cleanDomain}: ${Object.keys(items[0]).join(', ')}`);
      } else {
        this.logger.warn(`competitors_domain returned 0 items for ${cleanDomain} (status: ${task?.status_message})`);
      }
      return (items as any[]).map((item) => {
        // intersections = number of keywords BOTH domains rank for. DataForSEO
        // exposes it at item.intersections; fall back to the intersecting
        // metrics count if the shape ever differs.
        const intersections =
          (typeof item.intersections === 'number' ? item.intersections : undefined) ??
          (typeof item.metrics?.organic?.count === 'number' ? item.metrics.organic.count : undefined) ??
          0;
        return {
          domain: item.domain as string,
          avgPosition: (item.avg_position as number) ?? null,
          intersections,
          etv:
            (item.etv as number) ??
            (item.full_domain_metrics?.organic?.etv as number) ??
            (item.metrics?.organic?.etv as number) ??
            null,
        };
      })
      // Real rivals (most shared keywords) first.
      .sort((a, b) => (b.intersections ?? 0) - (a.intersections ?? 0));
    } catch (err) {
      this.logger.warn('getCompetitorDomains failed', err);
      return [];
    }
  }

  async getDomainIntersection(domain1: string, domain2: string, limit = 50, locationCode = 2792, languageCode = 'tr'): Promise<Array<{
    keyword: string; searchVolume: number; domain1Position: number | null; domain2Position: number | null;
  }>> {
    try {
      const clean1 = domain1.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const clean2 = domain2.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const response = await this.request<{
        tasks: Array<{ result?: Array<{ items?: Array<Record<string, unknown>> }> }>;
      }>('/dataforseo_labs/google/domain_intersection/live', [{
        target1: clean1,
        target2: clean2,
        location_code: locationCode,
        language_code: languageCode,
        limit,
      }]);
      const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
      return (items as any[]).map((item) => ({
        keyword: (item.keyword_data as any)?.keyword as string,
        searchVolume: (item.keyword_data as any)?.keyword_info?.search_volume ?? 0,
        domain1Position: (item.first_domain_serp_element as any)?.rank_absolute ?? null,
        domain2Position: (item.second_domain_serp_element as any)?.rank_absolute ?? null,
      })).filter((i) => i.keyword);
    } catch (err) {
      this.logger.warn('getDomainIntersection failed', err);
      return [];
    }
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

  private normalizeDomain(raw: string): string {
    return (raw ?? '')
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '')
      .toLowerCase()
      .trim();
  }

  private safeHostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /** True when a DataForSEO task indicates the backlinks subscription is missing. */
  private isSubscriptionError(statusCode?: number, statusMessage?: string): boolean {
    if (statusCode && statusCode === 20000) return false;
    const msg = (statusMessage ?? '').toLowerCase();
    return /subscription|access denied/.test(msg);
  }

  /**
   * Resolve a DataForSEO numeric location_code from either an ISO-3166 country
   * code (project.country, e.g. "TR", "DE") or a country name ("Turkey").
   * Public so callers (keyword/competitor/geo services) can map a project's
   * country to the right location for fully dynamic, multi-country scans.
   */
  resolveLocationCode(location: string): number {
    if (!location) return 2792;
    const key = location.trim();
    const byName: Record<string, number> = {
      Turkey: 2792, 'United States': 2840, 'United Kingdom': 2826,
      Germany: 2276, France: 2250, Spain: 2724, Italy: 2380,
      Netherlands: 2528, Russia: 2643, India: 2356, 'Saudi Arabia': 2682,
      'United Arab Emirates': 2784,
    };
    const byIso: Record<string, number> = {
      TR: 2792, US: 2840, GB: 2826, UK: 2826, DE: 2276, FR: 2250, ES: 2724,
      IT: 2380, NL: 2528, RU: 2643, IN: 2356, SA: 2682, AE: 2784, AT: 2040,
      CH: 2756, BE: 2056, CA: 2124, AU: 2036, BR: 2076, MX: 2484, PL: 2616,
      SE: 2752, NO: 2578, DK: 2208, FI: 2246, PT: 2620, GR: 2300, RO: 2642,
      EG: 2818, AZ: 2031, UA: 2804,
    };
    return byName[key] ?? byIso[key.toUpperCase()] ?? 2792;
  }
}
