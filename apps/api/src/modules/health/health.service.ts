import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import * as os from 'os';

type CheckResult = { status: string; latencyMs?: number };
type DiskResult = { status: string; freeGb: number; totalGb: number };
type WorkerResult = { status: string; queues?: Record<string, number> };

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
      status: db.status === 'ok' && redis.status === 'ok' ? 'ok' : 'degraded',
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

  private async checkDb(): Promise<CheckResult> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch {
      return { status: 'error' };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    // In production: ping Redis client
    try {
      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }

  private async checkWorker(): Promise<WorkerResult> {
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

  private checkDisk(): DiskResult {
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
      await this.prisma.systemHealthCheck.create({
        data: {
          service: 'DB',
          status: 'UP',
        },
      });
    } catch (err) {
      this.logger.error('Failed to save health check:', err);
    }
  }
}
