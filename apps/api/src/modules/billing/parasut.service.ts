import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface InvoiceData {
  itemType: 'invoice';
  description: string;
  issueDate: string;
  currency: string;
  exchangeRate?: number;
  invoiceSeries?: string;
  invoiceId?: number;
  contactId: string;
  lines: InvoiceLine[];
  billingAddress?: string;
  billingPhone?: string;
  billingPostalCode?: string;
  billingCity?: string;
  billingCountry?: string;
  taxNumber?: string;
}

export interface InvoiceLine {
  quantity: number;
  unitPrice: number;
  vatRate: number;
  name: string;
}

@Injectable()
export class ParasutService {
  private readonly baseUrl: string;
  private readonly companyId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly username: string;
  private readonly password: string;
  private readonly http: AxiosInstance;

  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly config: ConfigService) {
    this.companyId = config.get<string>('PARASUT_COMPANY_ID', '');
    this.clientId = config.get<string>('PARASUT_CLIENT_ID', '');
    this.clientSecret = config.get<string>('PARASUT_CLIENT_SECRET', '');
    this.username = config.get<string>('PARASUT_USERNAME', '');
    this.password = config.get<string>('PARASUT_PASSWORD', '');
    this.baseUrl = config.get<string>(
      'PARASUT_API_URL',
      'https://api.parasut.com/v4',
    );

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 30_000,
    });
  }

  /**
   * Ensure we have a valid OAuth token. Fetches a new one if expired.
   */
  async ensureToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const response = await axios.post<{
      access_token: string;
      expires_in: number;
    }>(
      `${this.baseUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.username,
        password: this.password,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
    return this.accessToken;
  }

  /**
   * Create an e-invoice (e-fatura) on Paraşüt.
   */
  async createInvoice(invoiceData: InvoiceData): Promise<string> {
    const token = await this.ensureToken();

    const body = {
      data: {
        type: 'sales_invoices',
        attributes: {
          item_type: invoiceData.itemType,
          description: invoiceData.description,
          issue_date: invoiceData.issueDate,
          currency: invoiceData.currency,
          exchange_rate: invoiceData.exchangeRate ?? 1,
          invoice_series: invoiceData.invoiceSeries,
          invoice_id: invoiceData.invoiceId,
          billing_address: invoiceData.billingAddress,
          billing_phone: invoiceData.billingPhone,
          billing_postal_code: invoiceData.billingPostalCode,
          billing_city: invoiceData.billingCity,
          billing_country: invoiceData.billingCountry,
          tax_number: invoiceData.taxNumber,
          lines: invoiceData.lines.map((l) => ({
            quantity: l.quantity,
            unit_price: l.unitPrice,
            vat_rate: l.vatRate,
            name: l.name,
          })),
        },
        relationships: {
          contact: {
            data: { id: invoiceData.contactId, type: 'contacts' },
          },
        },
      },
    };

    const response = await this.http.post<{ data: { id: string } }>(
      `/${this.companyId}/sales_invoices`,
      body,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return response.data.data.id;
  }

  /**
   * Retrieve the PDF download URL of a Paraşüt invoice.
   */
  async getInvoicePdf(invoiceId: string): Promise<string> {
    const token = await this.ensureToken();

    const response = await this.http.get<{ data: { attributes: { pdf_url?: string; public_url?: string } } }>(
      `/${this.companyId}/sales_invoices/${invoiceId}?include=e_invoice`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const attrs = response.data.data.attributes;
    const pdfUrl = attrs.pdf_url ?? attrs.public_url;

    if (!pdfUrl) {
      throw new InternalServerErrorException(
        `PDF not available for invoice ${invoiceId}`,
      );
    }

    return pdfUrl;
  }

  /**
   * Sync payment status of an invoice from Paraşüt.
   */
  async syncStatus(invoiceId: string): Promise<{ status: string; paidAt?: string }> {
    const token = await this.ensureToken();

    const response = await this.http.get<{
      data: {
        attributes: {
          net_total: string;
          remaining: string;
          paid_at?: string;
          is_active: boolean;
        };
      };
    }>(
      `/${this.companyId}/sales_invoices/${invoiceId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const attrs = response.data.data.attributes;
    const remaining = parseFloat(attrs.remaining);
    const status = remaining <= 0 ? 'PAID' : 'UNPAID';

    return { status, paidAt: attrs.paid_at };
  }
}
