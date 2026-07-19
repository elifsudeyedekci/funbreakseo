import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/org.module';
import { BillingModule } from './modules/billing/billing.module';
import { ProjectModule } from './modules/project/project.module';
import { KeywordModule } from './modules/keyword/keyword.module';
import { DataForSeoModule } from './modules/dataforseo/dataforseo.module';
import { LlmModule } from './modules/llm/llm.module';
import { RankTrackingModule } from './modules/rank-tracking/rank-tracking.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { ContentModule } from './modules/content/content.module';
import { GeoModule } from './modules/geo/geo.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { MarketModule } from './modules/market/market.module';
import { ReportModule } from './modules/report/report.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SupportModule } from './modules/support/support.module';
import { AffiliateModule } from './modules/affiliate/affiliate.module';
import { AutopilotModule } from './modules/autopilot/autopilot.module';
import { AbTestModule } from './modules/ab-test/ab-test.module';
import { EmailNotificationModule } from './modules/email-notification/email-notification.module';
import { PublicModule } from './modules/public/public.module';
import { CustomerApiModule } from './modules/customer-api/customer-api.module';
import { HealthModule } from './modules/health/health.module';
import { CompetitorModule } from './modules/competitor/competitor.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { SiteIntelModule } from './modules/site-intel/site-intel.module';

@Module({
  imports: [
    // Config — global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        // SSR fetch'leri ve panel istekleri aynı IP'den gelebilir — geniş tut,
        // hassas endpoint'ler kendi @Throttle limitini taşır
        limit: 300,
      },
    ]),

    // Redis Bull queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // Cron scheduler
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    OrganizationModule,
    BillingModule,
    ProjectModule,
    KeywordModule,
    DataForSeoModule,
    LlmModule,
    RankTrackingModule,
    CrawlerModule,
    ContentModule,
    GeoModule,
    OutreachModule,
    MarketModule,
    ReportModule,
    NotificationModule,
    AdminModule,
    OnboardingModule,
    SupportModule,
    AffiliateModule,
    AutopilotModule,
    AbTestModule,
    EmailNotificationModule,
    PublicModule,
    CustomerApiModule,
    HealthModule,
    CompetitorModule,
    PerformanceModule,
    SiteIntelModule,
  ],
  providers: [
    // Global rate limit — ThrottlerModule tek başına yetmez, guard da kayıtlı olmalı
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
