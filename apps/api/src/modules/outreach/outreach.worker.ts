import { Injectable, Logger } from '@nestjs/common'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { InjectQueue } from '@nestjs/bullmq'
import { Job, Queue } from 'bullmq'
import { Cron } from '@nestjs/schedule'
import axios from 'axios'
import * as nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { PrismaService } from '../../prisma.service'

@Injectable()
@Processor('outreach')
export class OutreachWorker extends WorkerHost {
  private readonly logger = new Logger(OutreachWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('outreach') private readonly queue: Queue,
  ) {
    super()
  }

  async process(job: Job<{ campaignId?: string; prospectId?: string; step?: number; orderId?: string }>): Promise<void> {
    switch (job.name) {
      case 'find-prospects':
        return this.findProspects(job.data.campaignId!)
      case 'generate-emails':
        return this.generateEmails(job.data.campaignId!)
      case 'send-emails':
        return this.sendEmails(job.data.campaignId!)
      case 'follow-up':
        return this.sendFollowUp(job.data.campaignId!, job.data.prospectId!, job.data.step ?? 2)
      default:
        this.logger.warn(`Unknown job name: ${job.name}`)
    }
  }

  // ─── follow-up ─────────────────────────────────────────────────────────────

  private async sendFollowUp(campaignId: string, prospectId: string, step: number): Promise<void> {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        emails: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    const skipStatuses = ['REPLIED_POSITIVE', 'REPLIED_NEGATIVE', 'WON', 'LOST', 'BOUNCED']
    if (!prospect || skipStatuses.includes(prospect.status)) {
      this.logger.log(`Follow-up skipped for prospect ${prospectId} (status: ${prospect?.status ?? 'not found'})`)
      return
    }
    if (!prospect.contactEmail) {
      this.logger.warn(`Follow-up skipped for prospect ${prospectId}: no contact email`)
      return
    }

    const campaign = await this.prisma.outreachCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return

    const subject = step === 2
      ? `Following up: Collaboration opportunity with ${prospect.domain}`
      : `Last follow-up: Link opportunity for ${prospect.domain}`

    const body = step === 2
      ? `Hi,\n\nJust following up on my previous email regarding a collaboration opportunity. I'd love to discuss how linking to our page could benefit your readers.\n\nPlease let me know if you're interested.\n\nBest regards`
      : `Hi,\n\nThis is my final follow-up. If you're not interested, no worries at all — I won't reach out again. But if there's any chance this could work, I'd love to hear from you.\n\nThanks for your time!`

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      const threadId = `funbreak-${campaignId}-${prospectId}-followup-${step}-${Date.now()}`

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: prospect.contactEmail,
        subject,
        text: body,
        headers: { 'Message-ID': `<${threadId}@funbreakseo.com>` },
      })

      await this.prisma.outreachEmail.create({
        data: {
          prospectId,
          sequenceStep: step,
          subject,
          body,
          status: 'SENT',
          sentAt: new Date(),
          threadId,
        },
      })

      await this.prisma.outreachCampaign.update({
        where: { id: campaignId },
        data: { emailsSent: { increment: 1 } },
      })

      this.logger.log(`Follow-up step ${step} sent to ${prospect.contactEmail}`)
    } catch (err) {
      this.logger.error(`Follow-up failed for prospect ${prospectId}: ${(err as Error).message}`)
    }
  }

  // ─── find-prospects ────────────────────────────────────────────────────────

  private async findProspects(campaignId: string): Promise<void> {
    const campaign = await this.prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: { project: true } as any,
    })
    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found`)
      return
    }

    const keyword = `${(campaign as any).topic || campaign.anchorText || ''} guest post write for us`.trim()

    let rawResults: any[] = []
    try {
      const response = await axios.post(
        'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
        [
          {
            keyword,
            location_code: 2840,
            language_code: 'en',
            device: 'desktop',
            os: 'windows',
            depth: 30,
          },
        ],
        {
          auth: {
            username: process.env.DATAFORSEO_LOGIN!,
            password: process.env.DATAFORSEO_PASSWORD!,
          },
          timeout: 30000,
        },
      )
      rawResults =
        response.data?.tasks?.[0]?.result?.[0]?.items?.filter(
          (item: any) => item.type === 'organic',
        ) ?? []
    } catch (err) {
      this.logger.error(`DataForSEO call failed for campaign ${campaignId}: ${(err as Error).message}`)
    }

    const projectDomain = (campaign as any).project?.domain ?? ''

    // Extract unique domains
    const seen = new Set<string>()
    const domains: Array<{ domain: string; url: string }> = []
    for (const item of rawResults) {
      try {
        const hostname = new URL(item.url).hostname.replace(/^www\./, '')
        if (hostname && hostname !== projectDomain.replace(/^www\./, '') && !seen.has(hostname)) {
          seen.add(hostname)
          domains.push({ domain: hostname, url: item.url })
        }
      } catch {
        // ignore unparseable URLs
      }
      if (domains.length >= 20) break
    }

    // Fetch already-known domains for this campaign to avoid duplicates
    const existing = await this.prisma.prospect.findMany({
      where: { campaignId },
      select: { domain: true },
    })
    const existingDomains = new Set(existing.map((p) => p.domain))

    let created = 0
    for (const { domain } of domains) {
      if (existingDomains.has(domain)) continue
      await this.prisma.prospect.create({
        data: {
          campaignId,
          domain,
          status: 'FOUND',
          foundVia: 'SEARCH',
        },
      })
      created++
    }

    await this.prisma.outreachCampaign.update({
      where: { id: campaignId },
      data: { prospectsFound: { increment: created } },
    })

    this.logger.log(`Campaign ${campaignId}: found ${created} new prospects`)
  }

  // ─── generate-emails ───────────────────────────────────────────────────────

  private async generateEmails(campaignId: string): Promise<void> {
    const campaign = await this.prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: {
        prospects: {
          where: {
            status: 'FOUND',
            emails: { none: {} },
          },
        },
      },
    })
    if (!campaign) return

    for (const prospect of campaign.prospects) {
      try {
        const prompt = `You are an outreach specialist. Write a personalized link-building outreach email.

Target website: ${prospect.domain}
Contact name: ${prospect.contactName ?? 'Editor'}
Our page URL: ${campaign.targetUrl}
Topic / anchor text: ${(campaign as any).topic ?? campaign.anchorText ?? 'our content'}

Requirements:
- Subject line: mention their domain naturally
- Personalized intro (1-2 sentences about their site)
- Value proposition: explain why linking to our page benefits their readers
- Clear, single CTA
- Friendly, concise tone (under 200 words total)

Respond with valid JSON only:
{
  "subject": "...",
  "body": "..."
}`

        const aiResponse = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 600,
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: {
              'x-api-key': process.env.ANTHROPIC_API_KEY!,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            timeout: 30000,
          },
        )

        const raw: string =
          aiResponse.data?.content?.[0]?.text ?? ''

        let subject = `Collaboration opportunity with ${prospect.domain}`
        let body = raw

        try {
          // Strip markdown fences if present
          const jsonStr = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
          const parsed = JSON.parse(jsonStr)
          subject = parsed.subject ?? subject
          body = parsed.body ?? body
        } catch {
          // Fallback: use raw text as body
        }

        await this.prisma.outreachEmail.create({
          data: {
            prospectId: prospect.id,
            sequenceStep: 1,
            subject,
            body,
            status: 'QUEUED',
          },
        })
      } catch (err) {
        this.logger.error(
          `Email generation failed for prospect ${prospect.id}: ${(err as Error).message}`,
        )
      }
    }

    this.logger.log(`Campaign ${campaignId}: email generation complete`)
  }

  // ─── send-emails ───────────────────────────────────────────────────────────

  private async sendEmails(campaignId: string): Promise<void> {
    const DAILY_LIMIT = 50

    // Count today's already-sent emails across all campaigns
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const sentToday = await this.prisma.outreachEmail.count({
      where: {
        status: { in: ['SENT', 'OPENED', 'REPLIED'] },
        sentAt: { gte: todayStart },
      },
    })

    if (sentToday >= DAILY_LIMIT) {
      this.logger.warn(`Daily send limit (${DAILY_LIMIT}) reached. Skipping campaign ${campaignId}.`)
      return
    }

    const remaining = DAILY_LIMIT - sentToday

    const campaign = await this.prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: {
        prospects: {
          where: { status: 'FOUND' },
          include: {
            emails: {
              where: { status: 'QUEUED' },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    })
    if (!campaign) return

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    let sent = 0

    for (const prospect of campaign.prospects) {
      if (sent >= remaining) break
      if (!prospect.contactEmail) continue
      const email = prospect.emails[0]
      if (!email) continue

      const threadId = `funbreak-${campaign.id}-${prospect.id}-${Date.now()}`

      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: prospect.contactEmail,
          subject: email.subject,
          text: email.body,
          headers: { 'Message-ID': `<${threadId}@funbreakseo.com>` },
        })

        await this.prisma.outreachEmail.update({
          where: { id: email.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            threadId,
          },
        })

        await this.prisma.prospect.update({
          where: { id: prospect.id },
          data: { status: 'CONTACTED' },
        })

        await this.prisma.outreachCampaign.update({
          where: { id: campaignId },
          data: { emailsSent: { increment: 1 } },
        })

        sent++

        // Schedule follow-ups
        const threeDays = 3 * 24 * 60 * 60 * 1000
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        await this.queue.add(
          'follow-up',
          { campaignId, prospectId: prospect.id, step: 2 },
          { delay: threeDays },
        )
        await this.queue.add(
          'follow-up',
          { campaignId, prospectId: prospect.id, step: 3 },
          { delay: sevenDays },
        )
      } catch (err) {
        this.logger.error(
          `Failed to send email to ${prospect.contactEmail}: ${(err as Error).message}`,
        )
      }
    }

    this.logger.log(`Campaign ${campaignId}: sent ${sent} emails`)
  }

  // ─── IMAP reply fetch (daily cron) ────────────────────────────────────────

  @Cron('0 8 * * *')
  async fetchImapReplies(): Promise<void> {
    const host = process.env.IMAP_HOST
    const user = process.env.IMAP_USER ?? process.env.SMTP_USER
    const pass = process.env.IMAP_PASS ?? process.env.SMTP_PASS

    if (!host || !user || !pass) {
      this.logger.warn('IMAP credentials not configured — skipping reply fetch')
      return
    }

    const client = new ImapFlow({
      host,
      port: parseInt(process.env.IMAP_PORT ?? '993', 10),
      secure: (process.env.IMAP_PORT ?? '993') !== '143',
      auth: { user, pass },
      logger: false,
    })

    try {
      await client.connect()
      const lock = await client.getMailboxLock('INBOX')
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

      try {
        for await (const msg of client.fetch({ since }, { source: true })) {
          if (!msg.source) continue
          const parsed = await simpleParser(Buffer.from(msg.source))
          const inReplyTo = String(parsed.headers?.get?.('in-reply-to') ?? '')
          const references = String(parsed.headers?.get?.('references') ?? '')

          const threadCandidates = [...inReplyTo.split(/\s+/), ...references.split(/\s+/)]
            .map((s) => s.replace(/[<>]/g, ''))
            .filter((s) => s.startsWith('funbreak-'))

          if (threadCandidates.length === 0) continue

          const match = await this.prisma.outreachEmail.findFirst({
            where: { threadId: { in: threadCandidates } },
            include: { prospect: true },
          })

          if (!match) continue

          const bodyText = (parsed.text ?? '').substring(0, 5000)

          let classification: 'INTERESTED' | 'NOT_INTERESTED' | 'QUESTION' | 'NEGOTIATION' | 'AUTO_REPLY' = 'QUESTION'
          try {
            const resp = await axios.post(
              'https://api.anthropic.com/v1/messages',
              {
                model: 'claude-3-haiku-20240307',
                max_tokens: 20,
                messages: [{ role: 'user', content: `Classify this outreach reply as one of: INTERESTED, NOT_INTERESTED, QUESTION, NEGOTIATION, AUTO_REPLY. Reply with just one word.\n\n${bodyText.substring(0, 500)}` }],
              },
              { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } },
            )
            const text = (resp.data.content?.[0]?.text ?? '').trim().toUpperCase()
            if (text.includes('NOT_INTERESTED')) classification = 'NOT_INTERESTED'
            else if (text.includes('INTERESTED')) classification = 'INTERESTED'
            else if (text.includes('NEGOTIATION')) classification = 'NEGOTIATION'
            else if (text.includes('AUTO_REPLY')) classification = 'AUTO_REPLY'
            else classification = 'QUESTION'
          } catch { /* use QUESTION fallback */ }

          const needsReview = classification === 'INTERESTED' || classification === 'NEGOTIATION'
          const newStatus = needsReview ? 'REPLIED_POSITIVE' : 'REPLIED_NEGATIVE'

          await this.prisma.outreachReply.create({
            data: {
              outreachEmailId: match.id,
              rawText: bodyText,
              classification,
              needsHumanReview: needsReview,
            },
          })

          await this.prisma.prospect.update({
            where: { id: match.prospectId },
            data: { status: newStatus },
          })

          // Olumlu dönüş → yayıncı teklifi olarak ADMİN onay kuyruğuna düşür.
          // Müşteri bu akışı hiç görmez; fiyatı admin belirler, sonra havuza girer.
          if (newStatus === 'REPLIED_POSITIVE' && match.prospect) {
            try {
              const existing = await this.prisma.publisherOffer.findFirst({
                where: {
                  domain: match.prospect.domain,
                  status: { in: ['PENDING_ADMIN_REVIEW', 'NEGOTIATING'] },
                },
              })
              if (!existing) {
                const offer = await this.prisma.publisherOffer.create({
                  data: {
                    sourceCampaignId: match.prospect.campaignId,
                    domain: match.prospect.domain,
                    domainRating: match.prospect.domainRating ?? null,
                    rawReplyText: bodyText,
                    status: 'PENDING_ADMIN_REVIEW',
                  },
                })
                const admins = await this.prisma.user.findMany({
                  where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
                  select: { id: true },
                })
                if (admins.length > 0) {
                  await this.prisma.notification.createMany({
                    data: admins.map((a) => ({
                      userId: a.id,
                      type: 'PUBLISHER_OFFER',
                      title: 'Yeni yayıncı teklifi — fiyat onayınızı bekliyor',
                      body: `${match.prospect!.domain} (DR ${match.prospect!.domainRating ?? '?'}) link satmaya olumlu döndü. Fiyatı belirleyip havuza ekleyin.`,
                      link: '/market',
                    })),
                  })
                }
                this.logger.log(`PublisherOffer oluşturuldu: ${match.prospect.domain} (${offer.id})`)
              }
            } catch (offerErr) {
              this.logger.warn(`PublisherOffer oluşturulamadı: ${(offerErr as Error).message}`)
            }
          }

          this.logger.log(`Reply classified as ${classification} for prospect ${match.prospectId}`)
        }
      } finally {
        lock.release()
      }

      await client.logout()
    } catch (err) {
      this.logger.error(`IMAP reply fetch failed: ${(err as Error).message}`)
      try { await client.logout() } catch { /* ignore */ }
    }
  }
}
