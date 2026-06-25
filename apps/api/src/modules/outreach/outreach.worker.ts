import { Injectable, Logger } from '@nestjs/common'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { InjectQueue } from '@nestjs/bullmq'
import { Job, Queue } from 'bullmq'
import { Cron } from '@nestjs/schedule'
import axios from 'axios'
import * as nodemailer from 'nodemailer'
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

  async process(job: Job<{ campaignId?: string; prospectId?: string; orderId?: string }>): Promise<void> {
    switch (job.name) {
      case 'find-prospects':
        return this.findProspects(job.data.campaignId!)
      case 'generate-emails':
        return this.generateEmails(job.data.campaignId!)
      case 'send-emails':
        return this.sendEmails(job.data.campaignId!)
      default:
        this.logger.warn(`Unknown job name: ${job.name}`)
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
    // Use imap or nodemailer imap to connect
    // Since imap library may not be available, simulate with a comment block
    // In production: connect to IMAP, fetch unread from last 24h
    // Match thread IDs to OutreachEmail.threadId
    // For each matched reply, call Claude to classify
    this.logger.log('IMAP reply fetch: checking inbox...')
    // TODO: implement when imap package is installed
    // For now, log that this runs
  }
}
