import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { EmailNotificationModule } from './modules/email-notification/email-notification.module';
import { PublicModule } from './modules/public/public.module';
import { CustomerApiModule } from './modules/customer-api/customer-api.module';
import { HealthModule } from './modules/health/health.module';

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
        limit: 100,
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
    EmailNotificationModule,
    PublicModule,
    CustomerApiModule,
    HealthModule,
  ],
})
export class AppModule {}
