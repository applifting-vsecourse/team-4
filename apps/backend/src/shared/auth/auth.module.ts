import { MailModule } from '@/core/email/mail.module';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { Config } from '@/shared/config/config.service';
import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { betterAuthProvider } from './providers/better-auth.provider';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRootAsync(Config, { validate: true }),
    MailModule,
  ],
  providers: [betterAuthProvider],
  exports: [betterAuthProvider],
})
export class AuthModule {}
