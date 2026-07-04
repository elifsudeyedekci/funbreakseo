import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// MJML templates (inline for now; in production load from .mjml files)
const TEMPLATES: Record<string, (vars: Record<string, unknown>) => string> = {
  welcome: (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="24px" color="#333">Hoş Geldiniz, ${vars['name']}!</mj-text>
      <mj-text>FunBreakSEO'ya hoş geldiniz. Hesabınız başarıyla oluşturuldu.</mj-text>
      <mj-button href="${vars['loginUrl']}">Giriş Yap</mj-button>
    </mj-column></mj-section></mj-body></mjml>
  `,
  invoice: (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="20px">Fatura #${vars['invoiceId']}</mj-text>
      <mj-text>Tutar: ${vars['currency']} ${vars['amount']}</mj-text>
      <mj-text>Tarih: ${vars['date']}</mj-text>
      <mj-button href="${vars['invoiceUrl']}">Faturayı Görüntüle</mj-button>
    </mj-column></mj-section></mj-body></mjml>
  `,
  digest: (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="22px">Haftalık SEO Özeti</mj-text>
      <mj-text>Ortalama sıralama: ${vars['avgRank']}</mj-text>
      <mj-text>GEO Görünürlük: ${vars['geoRate']}%</mj-text>
      <mj-text>Yeni backlink: ${vars['newBacklinks']}</mj-text>
      <mj-text>Yeni içerik: ${vars['newContent']}</mj-text>
      <mj-button href="${vars['dashboardUrl']}">Dashboard'a Git</mj-button>
    </mj-column></mj-section></mj-body></mjml>
  `,
  'crawl-done': (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="20px">Tarama Tamamlandı</mj-text>
      <mj-text>${vars['domain']} için tarama tamamlandı.</mj-text>
      <mj-text>Taranan sayfa: ${vars['pagesScanned']}</mj-text>
      <mj-text>Hata sayısı: ${vars['errors']}</mj-text>
      <mj-button href="${vars['reportUrl']}">Raporu Görüntüle</mj-button>
    </mj-column></mj-section></mj-body></mjml>
  `,
  'content-ready': (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="20px">İçerik Onay Bekliyor</mj-text>
      <mj-text>"${vars['title']}" başlıklı içerik onayınızı bekliyor.</mj-text>
      <mj-button href="${vars['reviewUrl']}">İncele ve Yayınla</mj-button>
    </mj-column></mj-section></mj-body></mjml>
  `,
  'rank-change': (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="20px">Büyük Sıralama Değişikliği</mj-text>
      <mj-text>"${vars['keyword']}" için sıralama: ${vars['previousRank']} → ${vars['currentRank']}</mj-text>
      <mj-text>Değişim: ${vars['change']} pozisyon</mj-text>
      <mj-button href="${vars['dashboardUrl']}">Dashboard'a Git</mj-button>
    </mj-column></mj-section></mj-body></mjml>
  `,
  'payment-failed': (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="20px" color="#e53e3e">Ödeme Başarısız</mj-text>
      <mj-text>${vars['amount']} tutarındaki ödemeniz işlenemedi.</mj-text>
      <mj-text>Lütfen ödeme bilgilerinizi güncelleyin.</mj-text>
      <mj-button href="${vars['billingUrl']}">Fatura Bilgilerini Güncelle</mj-button>
    </mj-column></mj-section></mj-body></mjml>
  `,
  'subscription-ending': (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="20px">Aboneliğiniz Sona Eriyor</mj-text>
      <mj-text>Aboneliğiniz ${vars['endDate']} tarihinde sona erecek.</mj-text>
      <mj-button href="${vars['renewUrl']}">Aboneliği Yenile</mj-button>
    </mj-column></mj-section></mj-body></mjml>
  `,
  'admin-sale': (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="20px" color="#38a169">Yeni Satış!</mj-text>
      <mj-text>Müşteri: ${vars['orgName']}</mj-text>
      <mj-text>Plan: ${vars['planName']}</mj-text>
      <mj-text>Tutar: ${vars['amount']}</mj-text>
      <mj-text>Toplam MRR: ${vars['mrr']}</mj-text>
    </mj-column></mj-section></mj-body></mjml>
  `,
  'admin-financial-digest': (vars) => `
    <mjml><mj-body><mj-section><mj-column>
      <mj-text font-size="22px">Haftalık Finansal Özet</mj-text>
      <mj-text>MRR: ${vars['mrr']}</mj-text>
      <mj-text>Bu hafta yeni abonelik: ${vars['newSubscriptions']}</mj-text>
      <mj-text>Bu hafta churn: ${vars['churn']}</mj-text>
      <mj-text>API maliyeti: ${vars['apiCost']}</mj-text>
      <mj-text>DataForSEO harcama: ${vars['dataForSeoCost']}</mj-text>
      <mj-text>LLM harcama: ${vars['llmCost']}</mj-text>
    </mj-column></mj-section></mj-body></mjml>
  `,
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: config.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', '"FunBreakSEO" <noreply@funbreakseo.com>'),
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}:`, err);
      throw err;
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    vars: Record<string, unknown>,
  ): Promise<void> {
    const templateFn = TEMPLATES[templateName];
    if (!templateFn) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    const mjmlContent = templateFn(vars);
    // In production: compile MJML to HTML using mjml package
    const html = this.mjmlToHtml(mjmlContent, vars);

    await this.sendMail(to, vars['subject'] as string ?? templateName, html);
  }

  async sendBulk(
    recipients: string[],
    subject: string,
    html: string,
    ratePerSecond = 5,
  ): Promise<void> {
    const delay = Math.ceil(1000 / ratePerSecond);
    for (const to of recipients) {
      await this.sendMail(to, subject, html);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  private mjmlToHtml(mjml: string, vars: Record<string, unknown>): string {
    // Simplified: in production use mjml.render(mjml).html
    // For now return a plain HTML version extracted from MJML tags
    return mjml
      .replace(/<mj-[^>]+>/g, '')
      .replace(/<\/mj-[^>]+>/g, '')
      .replace(/\n\s+/g, '\n')
      .trim();
  }
}
