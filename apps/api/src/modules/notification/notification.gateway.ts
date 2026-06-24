import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)['token'] ??
        (client.handshake.headers['authorization'] as string)?.replace(
          'Bearer ',
          '',
        );

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; orgId: string }>(
        token,
      );

      client.data = { userId: payload.sub, orgId: payload.orgId };

      this.joinUserRoom(client, payload.sub);
      void this.joinOrgRoom(client, payload.orgId);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Unauthorized WebSocket connection attempt: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as { userId?: string })?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  joinUserRoom(client: Socket, userId: string) {
    const room = `user:${userId}`;
    void client.join(room);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
  }

  async joinOrgRoom(client: Socket, orgId: string) {
    await client.join(`org:${orgId}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { time: Date.now() });
  }

  @SubscribeMessage('join:org')
  handleJoinOrg(
    @ConnectedSocket() client: Socket,
    @MessageBody() orgId: string,
  ) {
    void client.join(`org:${orgId}`);
  }

  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToOrg(orgId: string, event: string, data: unknown) {
    this.server.to(`org:${orgId}`).emit(event, data);
  }

  emitCrawlProgress(orgId: string, payload: {
    projectId: string;
    crawlId: string;
    pagesScanned: number;
    total: number;
    progress: number;
  }) {
    this.sendToOrg(orgId, 'crawl:progress', payload);
  }

  emitCrawlDone(orgId: string, payload: {
    projectId: string;
    crawlId: string;
    summary: Record<string, unknown>;
  }) {
    this.sendToOrg(orgId, 'crawl:done', payload);
    void this.notificationService.createNotification(
      orgId,
      'CRAWL_DONE',
      'Crawl tamamlandı',
      `Proje taraması tamamlandı.`,
      `/projects/${payload.projectId}`,
    );
  }

  emitRankUpdate(orgId: string, payload: {
    projectId: string;
    keywordId: string;
    keyword: string;
    previousRank: number;
    currentRank: number;
  }) {
    this.sendToOrg(orgId, 'rank:update', payload);
  }

  emitContentReady(orgId: string, payload: {
    projectId: string;
    contentId: string;
    title: string;
  }) {
    this.sendToOrg(orgId, 'content:ready', payload);
  }

  emitOrderUpdate(userId: string, payload: {
    orderId: string;
    status: string;
  }) {
    this.sendToUser(userId, 'order:update', payload);
  }
}
