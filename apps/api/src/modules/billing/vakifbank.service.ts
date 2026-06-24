import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface CardData {
  pan: string;
  expireMonth: string;
  expireYear: string;
  cvv: string;
  cardHolderName: string;
}

export interface PaymentInitResult {
  html3d: string;
  transactionId: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  message?: string;
}

@Injectable()
export class VakifBankService {
  private readonly merchantId: string;
  private readonly terminalId: string;
  private readonly posnetId: string;
  private readonly encKey: string;
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.merchantId = config.getOrThrow<string>('VAKIFBANK_MERCHANT_ID');
    this.terminalId = config.getOrThrow<string>('VAKIFBANK_TERMINAL_ID');
    this.posnetId = config.getOrThrow<string>('VAKIFBANK_POSNET_ID');
    this.encKey = config.getOrThrow<string>('VAKIFBANK_ENC_KEY');
    this.apiUrl = config.get<string>(
      'VAKIFBANK_API_URL',
      'https://onlineodeme.vakifbank.com.tr:4443/UIService/Index',
    );
  }

  /**
   * Initiate a 3D Secure payment and return HTML form to redirect user.
   */
  async initPayment(
    orderId: string,
    amount: number,
    currency: string,
    card: CardData,
    callbackUrl: string,
  ): Promise<PaymentInitResult> {
    // Amount in lowest denomination (kuruş for TRY)
    const amountStr = Math.round(amount * 100).toString();
    const transactionId = `TXN-${orderId}-${Date.now()}`;
    const currencyCode = this.currencyCode(currency);

    // VakıfBank POSNET 3D Init payload
    const payload = {
      MerchantId: this.merchantId,
      TerminalNo: this.terminalId,
      PosnetID: this.posnetId,
      TransactionType: 'Sale',
      OrderId: orderId,
      Amount: amountStr,
      CurrencyCode: currencyCode,
      CAVV: '',
      CAVVAlgorithm: '',
      ECI: '',
      CardNo: card.pan,
      ExpiredDate: `${card.expireMonth}${card.expireYear}`,
      Cvv: card.cvv,
      CardHolderName: card.cardHolderName,
      ReturnURL: callbackUrl,
      FailURL: callbackUrl,
      MAC: this.computeMac(orderId, amountStr, currencyCode, card.pan),
    };

    const response = await axios.post<{ Data?: { Body?: string } }>(
      this.apiUrl,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      },
    );

    const body = response.data?.Data?.Body;
    if (!body) {
      throw new BadRequestException('VakıfBank 3D init failed: empty response');
    }

    return { html3d: body, transactionId };
  }

  /**
   * Verify the callback payload and HMAC hash.
   */
  verifyCallback(
    payload: Record<string, string>,
    hash: string,
  ): boolean {
    const computedHash = this.computeCallbackHash(payload);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hash, 'hex'),
    );
  }

  /**
   * Issue a refund for a previously captured payment.
   */
  async refund(orderId: string, amount: number): Promise<RefundResult> {
    const amountStr = Math.round(amount * 100).toString();

    const payload = {
      MerchantId: this.merchantId,
      TerminalNo: this.terminalId,
      TransactionType: 'Return',
      OrderId: orderId,
      Amount: amountStr,
      MAC: this.computeRefundMac(orderId, amountStr),
    };

    const response = await axios.post<{
      Data?: { ApprovedCode?: string; ResponseCode?: string; ResponseText?: string };
    }>(this.apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    const data = response.data?.Data;
    if (!data) {
      return { success: false, message: 'No response from VakıfBank' };
    }

    const success = data.ResponseCode === '00' || !!data.ApprovedCode;

    return {
      success,
      refundId: data.ApprovedCode,
      message: data.ResponseText,
    };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private currencyCode(currency: string): string {
    const map: Record<string, string> = {
      TRY: '949',
      USD: '840',
      EUR: '978',
      GBP: '826',
    };
    return map[currency.toUpperCase()] ?? '949';
  }

  private computeMac(
    orderId: string,
    amount: string,
    currencyCode: string,
    pan: string,
  ): string {
    const raw = `${this.merchantId};${orderId};${amount};${currencyCode};${pan};${this.encKey}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private computeCallbackHash(payload: Record<string, string>): string {
    const keys = ['MerchantId', 'OrderId', 'Amount', 'ApprovedCode'];
    const parts = keys.map((k) => payload[k] ?? '');
    const raw = `${parts.join(';')};${this.encKey}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private computeRefundMac(orderId: string, amount: string): string {
    const raw = `${this.merchantId};${orderId};${amount};${this.encKey}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
