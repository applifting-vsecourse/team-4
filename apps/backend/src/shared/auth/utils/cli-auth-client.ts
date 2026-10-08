import { PrismaClient } from '@/generated/prisma/client';
import { betterAuthCoreConfig } from '@/shared/auth/config/better-auth.config';
import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

// Prisma 7 takes its connection from a driver adapter, same as PrismaService.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  ...betterAuthCoreConfig,
});
