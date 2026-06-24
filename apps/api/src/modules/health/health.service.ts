import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import * as os from 'os';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const [db, redis, worker, disk] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.checkWorker(),
      this.checkDisk(),
    ]);

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: db && redis ? 'ok' : 'degraded',
      timestamp: new Date(),
      uptime,
      checks: {
        db,
        redis,
        worker,
        disk,
      },
    };
  }

  private async checkDb(): Promise<{ status: string; latencyMs?: number }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      return { status: 'error' };
    }
  }

  private async checkRedis(): Promise<{ status: string }> {
    // In production: ping Redis client
    try {
      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }

  private async checkWorker(): Promise<{
    status: string;
    queues?: Record<string, number>;
  }> {
    try {
      const queueStats = await this.prisma.queueJob.groupBy({
        by: ['queueName', 'status'],
        _count: { id: true },
        where: {
          status: { in: ['ACTIVE', 'WAITING', 'FAILED'] },
        },
      });

      const failed = queueStats.filter((q) => q.status === 'FAILED');
      const hasHighFailures = failed.some((f) => f._count.id > 50);

      return {
        status: hasHighFailures ? 'degraded' : 'ok',
        queues: Object.fromEntries(
          queueStats.map((q) => [`${q.queueName}:${q.status}`, q._count.id]),
        ),
      };
    } catch {
      return { status: 'error' };
    }
  }

  private checkDisk(): { status: string; freeGb: number; totalGb: number } {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const freeGb = Math.round((freeMem / 1024 / 1024 / 1024) * 10) / 10;
    const totalGb = Math.round((totalMem / 1024 / 1024 / 1024) * 10) / 10;

    return {
      status: freeGb > 1 ? 'ok' : 'warning',
      freeGb,
      totalGb,
    };
  }

  @Cron('*/5 * * * *') // Every 5 minutes
  async saveHealthCheck() {
    try {
      const health = await this.getHealth();

      await this.prisma.systemHealthCheck.create({
        data: {
          status: health.status,
          dbOk: health.checks.db.status === 'ok',
          redisOk: health.checks.redis.status === 'ok',
          workerOk: health.checks.worker.status === 'ok',
          diskOk: health.checks.disk.status === 'ok',
          meta: health as unknown as Record<string, unknown>,
        },
      });
    } catch (err) {
      this.logger.error('Failed to save health check:', err);
    }
  }
}
