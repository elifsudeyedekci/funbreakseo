import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { VakifBankService } from './vakifbank.service';
import { ParasutService } from './parasut.service';
import { CurrencyService } from './currency.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    VakifBankService,
    ParasutService,
    CurrencyService,
    PrismaService,
  ],
  exports: [BillingService, CurrencyService],
})
export class BillingModule {}
