// Prisma 7 no longer loads .env automatically for CLI commands.
import 'dotenv/config';

import { defineConfig } from 'prisma/config';

// Prisma 7 no longer accepts `url` inside schema.prisma — the connection string
// for CLI commands (migrate, studio) lives here instead. The running app gets
// its connection from the driver adapter in src/core/prisma/prisma.service.ts.
//
// Read straight from process.env rather than Prisma's `env()` helper, which
// throws while merely loading this file. `prisma generate` needs no database
// and runs at image build time, where DATABASE_URL rightly doesn't exist.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Keep the project seed entry point available after a reset.
    seed: 'pnpm seed',
  },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
