import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class NotificationService {
  private gateway: {
    sendToUser: (userId: string, event: string, data: unknown) => void;
  } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  setGateway(gateway: {
    sendToUser: (userId: string, event: string, data: unknown) => void;
  }) {
    this.gateway = gateway;
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    link?: string,
    meta?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, link, meta: (meta ?? {}) as object, read: false },
    });

    // Emit via WebSocket
    if (this.gateway) {
      this.gateway.sendToUser(userId, 'notification:new', notification);
    }

    return notification;
  }

  async getNotifications(userId: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const unreadCount = await this.getUnreadCount(userId);

    return { total, page, limit, unreadCount, data: notifications };
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async getPreferences(userId: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: `notification_prefs_${userId}` },
    });
    if (setting) {
      return setting.value;
    }
    // Return defaults
    return {
      emailOnNewMention: true,
      emailOnRankDrop: true,
      emailWeeklyDigest: true,
      marketingEmails: true,
      pushNotifications: true,
    };
  }

  async updatePreferences(userId: string, prefs: Record<string, unknown>) {
    // Persist preferences in SystemSetting as a JSON blob keyed per user
    await this.prisma.systemSetting.upsert({
      where: { key: `notification_prefs_${userId}` },
      update: { value: prefs as object },
      create: { key: `notification_prefs_${userId}`, value: prefs as object },
    });
    return { updated: true, preferences: prefs };
  }

  async unsubscribeMarketing(userId: string) {
    await this.updatePreferences(userId, { marketingEmails: false });
    return { unsubscribed: true };
  }
}
