import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

export type CurrencyRates = Record<string, number>;

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = config.get<string>('EXCHANGE_RATE_API_KEY');
    this.apiUrl = config.get<string>(
      'EXCHANGE_RATE_API_URL',
      'https://v6.exchangerate-api.com/v6',
    );
  }

  /**
   * Get current exchange rates from DB cache (updated daily via cron).
   */
  async getRates(baseCurrency = 'TRY'): Promise<CurrencyRates> {
    const rates = await this.prisma.currencyRate.findMany({
      where: { base: baseCurrency },
    });

    if (rates.length > 0) {
      const result: CurrencyRates = {};
      for (const r of rates) {
        result[r.target] = parseFloat(r.rate.toString());
      }
      return result;
    }

    // Fallback — fetch fresh
    return this.fetchAndCacheRates(baseCurrency);
  }

  /**
   * Convert an amount from one currency to another.
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    const rates = await this.getRates(fromCurrency);
    const rate = rates[toCurrency];

    if (!rate) {
      throw new Error(
        `Exchange rate for ${fromCurrency} -> ${toCurrency} not available`,
      );
    }

    return amount * rate;
  }

  /**
   * Daily cron to refresh all rates.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshRates(): Promise<void> {
    for (const base of ['TRY', 'USD', 'EUR']) {
      try {
        await this.fetchAndCacheRates(base);
        this.logger.log(`Currency rates refreshed for ${base}`);
      } catch (err) {
        this.logger.error(`Failed to refresh rates for ${base}`, err);
      }
    }
  }

  private async fetchAndCacheRates(base: string): Promise<CurrencyRates> {
    const url = this.apiKey
      ? `${this.apiUrl}/${this.apiKey}/latest/${base}`
      : `https://open.er-api.com/v6/latest/${base}`;

    const response = await axios.get<{
      conversion_rates?: Record<string, number>;
      rates?: Record<string, number>;
    }>(url, { timeout: 10_000 });

    const rawRates =
      response.data.conversion_rates ?? response.data.rates ?? {};

    // Upsert into DB
    for (const [target, rate] of Object.entries(rawRates)) {
      await this.prisma.currencyRate.upsert({
        where: { base_target: { base, target } },
        create: { base, target, rate, fetchedAt: new Date() },
        update: { rate, fetchedAt: new Date() },
      });
    }

    return rawRates;
  }
}
