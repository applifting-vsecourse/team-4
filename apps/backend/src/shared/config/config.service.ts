import { Env } from '@applifting-io/nestjs-decorated-config';
import { Injectable } from '@nestjs/common';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsSemVer,
  IsUrl,
} from 'class-validator';

/**
 * A config class that is populated from environment variables and enable the use of validation decorators.
 */
@Injectable()
export class Config {
  // basic info
  readonly name: string = 'Quacker backend';
  readonly description: string =
    'Backend for Quacker, a social media platform for sharing short messages. Project example for educational purposes.';

  @IsSemVer()
  readonly version: string = '0.1.0';

  @Env<string>('CI_COMMIT_SHA', { expose: true })
  @IsOptional()
  readonly gitCommitSha?: string;

  @Env<string>('BETTER_AUTH_SECRET')
  @IsNotEmpty()
  readonly betterAuthSecret!: string;

  @Env('SUPERADMIN_EMAIL')
  readonly superadminEmail!: string;

  @Env('SUPERADMIN_PASSWORD')
  readonly superadminPassword!: string;

  @Env('NODE_ENV', { expose: true })
  @IsOptional()
  readonly nodeEnv?: string;

  @Env('BACKEND_URL', {
    defaultValue: 'http://localhost:4050',
    expose: true,
    removeTrailingSlash: true,
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  readonly backendUrl!: string;

  @Env('FRONTEND_URL', {
    defaultValue: 'http://localhost:3050',
    expose: true,
    removeTrailingSlash: true,
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  readonly frontendUrl!: string;

  @Env('FRONTEND_RESET_PASSWORD_ROUTE', {
    defaultValue: 'reset-password',
    expose: true,
  })
  @IsNotEmpty()
  readonly frontendResetPasswordUrl!: string;

  @Env('PORT', { expose: true, defaultValue: 4050 })
  readonly port!: number;

  @Env('RESEND_API_KEY')
  @IsOptional()
  readonly resendApiKey?: string;

  @Env('EMAIL_FROM', {
    expose: true,
    defaultValue: 'Quacker <onboarding@resend.dev>',
  })
  @IsNotEmpty()
  readonly emailFrom!: string;

  @Env('SMTP_HOST', { expose: true })
  @IsOptional()
  readonly smtpHost?: string;

  @Env('SMTP_SECURE', { expose: true, defaultValue: true })
  @IsBoolean()
  readonly smtpSecure!: boolean;

  @Env('SMTP_PORT', { expose: true, defaultValue: 465 })
  readonly smtpPort!: number;

  @Env('SMTP_USERNAME', { expose: true })
  @IsOptional()
  readonly smtpUsername?: string;

  @Env('SMTP_PASSWORD')
  @IsOptional()
  readonly smtpPassword?: string;
}
