import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { VakifBankService } from './vakifbank.service';
import { ParasutService } from './parasut.service';
import { CurrencyService } from './currency.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { PrismaService } from '../../prisma.service';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [EmailNotificationModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    VakifBankService,
    ParasutService,
    CurrencyService,
    SubscriptionLifecycleService,
    PrismaService,
  ],
  exports: [BillingService, CurrencyService],
})
export class BillingModule {}
