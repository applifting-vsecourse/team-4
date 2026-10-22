import { Config } from '@/shared/config/config.service';
import { Global, Module } from '@nestjs/common';
import { ConsoleMailerAdapterFactory } from './adapters/console-mailer/console-mailer.adapter.factory';
import { ResendAdapterFactory } from './adapters/resend/resend.adapter.factory';
import { SMTPAdapterFactory } from './adapters/smtp/smtp.adapter.factory';
import { EmailModule } from './email.module';
import { EmailService } from './interfaces/email-service.interface';
import { RecipientRestrictedEmailService } from './services/recipient-restricted-email.service';

/**
 * Picks an email adapter based on env:
 *   RESEND_API_KEY set           → Resend
 *   SMTP_HOST + USERNAME + PASS  → SMTP
 *   otherwise                    → Console (logs emails to stdout, dev only)
 *
 * If EMAIL_ALLOWED_RECIPIENT is set, the chosen adapter only delivers to that
 * address (needed while Resend has no verified domain).
 *
 * Import this module whenever you need to inject `'EmailService'`.
 * The single shared `EmailService` instance is provided here so every
 * consumer (auth flows, debug endpoints, …) uses the same transport.
 */
@Global()
@Module({
  imports: [
    EmailModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const config = args[0] as Config;
        const adapter = createAdapter(config);
        return config.emailAllowedRecipient
          ? new RecipientRestrictedEmailService(
              adapter,
              config.emailAllowedRecipient,
            )
          : adapter;
      },
      inject: [Config],
    }),
  ],
  exports: [EmailModule],
})
export class MailModule {}

function createAdapter(config: Config): EmailService {
  if (config.resendApiKey) {
    return ResendAdapterFactory.create({
      apiKey: config.resendApiKey,
      from: config.emailFrom,
    });
  }
  if (config.smtpHost && config.smtpUsername && config.smtpPassword) {
    return SMTPAdapterFactory.create({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      user: config.smtpUsername,
      pass: config.smtpPassword,
    });
  }
  return ConsoleMailerAdapterFactory.create();
}
