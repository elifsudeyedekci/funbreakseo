import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import sharp from 'sharp'
import { PriorityRecommendation } from '@funbreakseo/shared'

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export interface UsabilityChecks {
  hasViewportMeta: boolean
  smallFontCount: number
  smallTouchTargetCount: number
  hasFlashOrIframe: boolean
  hasFavicon: boolean
  plainTextEmailExposed: boolean
}

export interface UsabilityReport extends UsabilityChecks {
  recommendations: PriorityRecommendation[]
}

export interface ScreenshotSet {
  desktop: string | null
  mobile: string | null
  tablet: string | null
}

export interface UsabilityResult {
  usability: UsabilityReport
  screenshots: ScreenshotSet
}

interface MobileEvaluateResult {
  hasViewportMeta: boolean
  hasFavicon: boolean
  hasFlashOrIframe: boolean
  smallFontCount: number
  smallTouchTargetCount: number
  plainTextEmailExposed: boolean
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class UsabilityService {
  private readonly logger = new Logger(UsabilityService.name)

  async analyze(url: string): Promise<UsabilityResult> {
    const screenshots: ScreenshotSet = { desktop: null, mobile: null, tablet: null }
    let checks: UsabilityChecks = {
      hasViewportMeta: false,
      smallFontCount: 0,
      smallTouchTargetCount: 0,
      hasFlashOrIframe: false,
      hasFavicon: false,
      plainTextEmailExposed: false,
    }

    let browser: any = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer')
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })

      const [desktopBuf, tabletBuf, mobileResult] = await Promise.all([
        this.captureViewport(browser, url, 1440, 900),
        this.captureViewport(browser, url, 768, 1024),
        this.captureMobileAndEvaluate(browser, url),
      ])

      screenshots.desktop = await this.toDataUri(desktopBuf)
      screenshots.tablet = await this.toDataUri(tabletBuf)
      screenshots.mobile = await this.toDataUri(mobileResult.screenshot)
      checks = mobileResult.checks
    } catch (err: any) {
      this.logger.warn(`Puppeteer analysis failed for ${url}: ${err.message}`)
    } finally {
      if (browser) {
        try {
          await browser.close()
        } catch {
          // ignore close failures
        }
      }
    }

    // Favicon: DOM check (done inside evaluate) OR a HEAD request to /favicon.ico
    if (!checks.hasFavicon) {
      checks.hasFavicon = await this.checkFaviconHead(url)
    }

    const recommendations = this.buildRecommendations(checks)

    return { usability: { ...checks, recommendations }, screenshots }
  }

  // -------------------------------------------------------------------------
  // Screenshot capture
  // -------------------------------------------------------------------------

  private async captureViewport(
    browser: any,
    url: string,
    width: number,
    height: number,
  ): Promise<Buffer | null> {
    let page: any = null
    try {
      page = await browser.newPage()
      await page.setViewport({ width, height })
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 20_000 })
      const buf = await page.screenshot({ type: 'jpeg', quality: 60 })
      return buf as Buffer
    } catch (err: any) {
      this.logger.warn(`Screenshot capture failed for ${url} (${width}x${height}): ${err.message}`)
      return null
    } finally {
      if (page) {
        try {
          await page.close()
        } catch {
          // ignore
        }
      }
    }
  }

  private async captureMobileAndEvaluate(
    browser: any,
    url: string,
  ): Promise<{ screenshot: Buffer | null; checks: UsabilityChecks }> {
    let page: any = null
    let screenshot: Buffer | null = null
    let checks: UsabilityChecks = {
      hasViewportMeta: false,
      smallFontCount: 0,
      smallTouchTargetCount: 0,
      hasFlashOrIframe: false,
      hasFavicon: false,
      plainTextEmailExposed: false,
    }

    try {
      page = await browser.newPage()
      await page.setViewport({ width: 375, height: 812 })
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 20_000 })
      screenshot = await page.screenshot({ type: 'jpeg', quality: 60 })

      // NOTE: this callback executes inside the browser page context via Puppeteer,
      // not in Node. The api project's tsconfig lib is ES2022-only (no "dom"), so
      // DOM globals (document, Element, getComputedStyle, ...) are accessed through
      // `globalThis as any` / `any` locals to keep this file typechecking under Node's
      // lib set while still compiling correctly to a function Puppeteer can serialize.
      const evaluated: MobileEvaluateResult = await page.evaluate(() => {
        const doc: any = (globalThis as any).document
        const getStyle: any = (globalThis as any).getComputedStyle

        const hasViewportMeta = !!doc.querySelector('meta[name="viewport"]')
        const hasFavicon = !!doc.querySelector('link[rel*="icon"]')
        const hasFlashOrIframe = !!doc.querySelector('embed, object, iframe')

        let smallFontCount = 0
        const textEls: any[] = Array.prototype.slice.call(doc.querySelectorAll('p, span, li, a, div'), 0, 500)
        for (const el of textEls) {
          const hasDirectText = Array.prototype.some.call(
            el.childNodes,
            (n: any) => n.nodeType === 3 && !!(n.textContent || '').trim(),
          )
          if (!hasDirectText) continue
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) continue
          const fontSize = parseFloat(getStyle(el).fontSize)
          if (!isNaN(fontSize) && fontSize < 16) smallFontCount++
        }

        let smallTouchTargetCount = 0
        const targets: any[] = Array.prototype.slice.call(
          doc.querySelectorAll('a, button, input[type=button], input[type=submit]'),
        )
        for (const el of targets) {
          const style = getStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden') continue
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) continue
          if (rect.width < 44 || rect.height < 44) smallTouchTargetCount++
        }

        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        const plainTextEmailExposed = emailRegex.test((doc.body && doc.body.innerText) || '')

        return {
          hasViewportMeta,
          hasFavicon,
          hasFlashOrIframe,
          smallFontCount,
          smallTouchTargetCount,
          plainTextEmailExposed,
        }
      })

      checks = evaluated
    } catch (err: any) {
      this.logger.warn(`Mobile evaluate failed for ${url}: ${err.message}`)
    } finally {
      if (page) {
        try {
          await page.close()
        } catch {
          // ignore
        }
      }
    }

    return { screenshot, checks }
  }

  private async toDataUri(buf: Buffer | null): Promise<string | null> {
    if (!buf) return null
    try {
      const compressed = await sharp(buf)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 65 })
        .toBuffer()
      return `data:image/jpeg;base64,${compressed.toString('base64')}`
    } catch (err: any) {
      this.logger.warn(`Screenshot compression failed: ${err.message}`)
      return null
    }
  }

  private async checkFaviconHead(url: string): Promise<boolean> {
    try {
      const base = new URL(url)
      const faviconUrl = `${base.protocol}//${base.host}/favicon.ico`
      const res = await axios.head(faviconUrl, {
        timeout: 3_000,
        headers: { 'User-Agent': 'FunBreakSEO-Crawler/1.0' },
        validateStatus: () => true,
      })
      return res.status === 200
    } catch {
      return false
    }
  }

  // -------------------------------------------------------------------------
  // Recommendations
  // -------------------------------------------------------------------------

  private buildRecommendations(checks: UsabilityChecks): PriorityRecommendation[] {
    const recs: PriorityRecommendation[] = []

    if (!checks.hasViewportMeta) {
      recs.push({
        code: 'USABILITY_MISSING_VIEWPORT',
        title: 'Missing viewport meta tag',
        category: 'USABILITY',
        priority: 'CRITICAL',
        howToFix:
          'Add <meta name="viewport" content="width=device-width, initial-scale=1"> inside <head> so the page renders correctly on mobile devices.',
      })
    }

    if (checks.smallFontCount > 0) {
      recs.push({
        code: 'USABILITY_SMALL_FONT',
        title: `${checks.smallFontCount} element(s) use text smaller than 16px on mobile`,
        category: 'USABILITY',
        priority: 'MEDIUM',
        howToFix:
          'Increase font-size to at least 16px for body text so mobile visitors do not need to pinch-zoom to read content.',
        affectedCount: checks.smallFontCount,
      })
    }

    if (checks.smallTouchTargetCount > 0) {
      recs.push({
        code: 'USABILITY_SMALL_TOUCH_TARGET',
        title: `${checks.smallTouchTargetCount} tap target(s) are smaller than 44x44px`,
        category: 'USABILITY',
        priority: 'MEDIUM',
        howToFix:
          'Increase the size/padding of buttons, links and form controls to at least 44x44px so they are easy to tap on mobile.',
        affectedCount: checks.smallTouchTargetCount,
      })
    }

    if (checks.hasFlashOrIframe) {
      recs.push({
        code: 'USABILITY_FLASH_OR_IFRAME',
        title: 'Page embeds Flash, <object> or <iframe> content',
        category: 'USABILITY',
        priority: 'LOW',
        howToFix:
          'Avoid legacy Flash/<object> embeds and audit third-party <iframe> usage — they can break on mobile and hurt load performance.',
      })
    }

    if (!checks.hasFavicon) {
      recs.push({
        code: 'USABILITY_MISSING_FAVICON',
        title: 'Site is missing a favicon',
        category: 'USABILITY',
        priority: 'LOW',
        howToFix:
          'Add a favicon.ico (or <link rel="icon">) so the site displays a brand icon in browser tabs and bookmarks.',
      })
    }

    if (checks.plainTextEmailExposed) {
      recs.push({
        code: 'USABILITY_PLAIN_EMAIL_EXPOSED',
        title: 'Plain-text email address exposed on the page',
        category: 'USABILITY',
        priority: 'LOW',
        howToFix:
          'Replace plain-text email addresses with a contact form or obfuscate them to reduce spam-bot scraping risk.',
      })
    }

    return recs
  }
}
