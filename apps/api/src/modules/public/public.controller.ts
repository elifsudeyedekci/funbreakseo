import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { PublicService } from './public.service';

@Controller()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('public/plans')
  getPlans() {
    return this.publicService.getPlans();
  }

  @Get('public/blog')
  getBlogList(
    @Query('locale') locale?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '12',
  ) {
    return this.publicService.getBlogList(locale, parseInt(page), parseInt(limit));
  }

  @Get('public/blog/:slug')
  getBlogBySlug(@Param('slug') slug: string) {
    return this.publicService.getBlogBySlug(slug);
  }

  @Post('public/contact')
  handleContact(
    @Body()
    dto: {
      name: string;
      email: string;
      subject: string;
      message: string;
    },
  ) {
    return this.publicService.handleContact(dto);
  }

  @Post('public/lead')
  handleLead(
    @Body()
    dto: {
      email: string;
      name: string;
      domain?: string;
      phone?: string;
    },
  ) {
    return this.publicService.handleLead(dto);
  }

  @Post('public/free-audit')
  handleFreeAudit(@Body() dto: { domain: string; email?: string }) {
    return this.publicService.handleFreeAudit(dto);
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async getSitemap(@Res() res: Response) {
    const xml = await this.publicService.getSitemap();
    res.send(xml);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobotsTxt(@Res() res: Response) {
    res.send(this.publicService.getRobotsTxt());
  }

  @Get('rss.xml')
  @Header('Content-Type', 'application/rss+xml')
  async getRssFeed(@Res() res: Response) {
    const xml = await this.publicService.getRssFeed();
    res.send(xml);
  }
}
