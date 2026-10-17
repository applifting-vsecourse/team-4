import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import { Injectable } from '@nestjs/common';
import { seedDatabase } from './seed/seed-database';

@Injectable()
export class SeedService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectBetterAuth private readonly auth: BetterAuth,
  ) {}

  async run(): Promise<void> {
    await seedDatabase(this.prisma, this.auth);
  }
}
