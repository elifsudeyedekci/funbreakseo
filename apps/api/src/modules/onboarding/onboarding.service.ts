import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export const ONBOARDING_STEPS = [
  'add_project',
  'connect_gsc',
  'add_keywords',
  'start_crawl',
  'generate_content',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(orgId: string) {
    const record = await this.prisma.onboardingStatus.findFirst({
      where: { organizationId: orgId },
    });

    const completedSteps: string[] = (record?.steps as string[]) ?? [];

    const steps = ONBOARDING_STEPS.map((step) => ({
      step,
      completed: completedSteps.includes(step),
    }));

    const percentage = Math.round(
      (completedSteps.length / ONBOARDING_STEPS.length) * 100,
    );

    return {
      steps,
      completedSteps,
      percentage,
      isComplete: completedSteps.length === ONBOARDING_STEPS.length,
    };
  }

  async completeStep(orgId: string, step: OnboardingStep) {
    if (!ONBOARDING_STEPS.includes(step)) {
      throw new Error(`Unknown onboarding step: ${step}`);
    }

    const existing = await this.prisma.onboardingStatus.findFirst({
      where: { organizationId: orgId },
    });

    const completedSteps: string[] = (existing?.steps as string[]) ?? [];

    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    if (existing) {
      await this.prisma.onboardingStatus.update({
        where: { id: existing.id },
        data: { steps: completedSteps },
      });
    } else {
      await this.prisma.onboardingStatus.create({
        data: { organizationId: orgId, steps: completedSteps },
      });
    }

    return this.getStatus(orgId);
  }

  async isOnboardingComplete(orgId: string): Promise<boolean> {
    const status = await this.getStatus(orgId);
    return status.isComplete;
  }
}
