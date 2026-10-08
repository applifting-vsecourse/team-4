import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { Inject, Injectable } from '@nestjs/common';
import { seedDatabase } from './seed/seed-database';

/**
 * Service for seeding the database with initial data.
 * Expects migrations to be applied first (`prisma migrate deploy`).
 */
@Injectable()
export class SeedService {
  constructor(
    private readonly config: Config,
    private readonly prisma: PrismaService,
    @Inject('BetterAuth') private readonly betterAuth: BetterAuth,
  ) {}

  async run(): Promise<void> {
    try {
      await seedDatabase(this.prisma, this.config, this.betterAuth);
    } catch (error) {
      console.error('Error seeding data:', error);
      process.exit(1);
    }
  }
}
