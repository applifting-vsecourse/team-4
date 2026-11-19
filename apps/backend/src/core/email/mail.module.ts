import { Config } from '@/shared/config/config.service';
import { Global, Module } from '@nestjs/common';
import { ConsoleMailerAdapterFactory } from './adapters/console-mailer/console-mailer.adapter.factory';
import { SMTPAdapterFactory } from './adapters/smtp/smtp.adapter.factory';
import { EmailModule } from './email.module';
import { EmailService } from './interfaces/email-service.interface';
import { ReservedDomainEmailService } from './services/reserved-domain-email.service';

/**
 * Picks an email adapter based on env:
 *   SMTP_HOST + USERNAME + PASS  → SMTP (Gmail, or any SMTP server); mail to
 *                                  reserved test domains is not sent
 *   otherwise                    → Console (logs emails to stdout, dev only)
 *
 * Import this module whenever you need to inject `'EmailService'`.
 * The single shared `EmailService` instance is provided here so every
 * consumer (auth flows, debug endpoints, …) uses the same transport.
 */
@Global()
@Module({
  imports: [
    EmailModule.forRootAsync({
      useFactory: async (...args: unknown[]) =>
        createAdapter(args[0] as Config),
      inject: [Config],
    }),
  ],
  exports: [EmailModule],
})
export class MailModule {}

function createAdapter(config: Config): EmailService {
  if (config.smtpHost && config.smtpUsername && config.smtpPassword) {
    const smtp = SMTPAdapterFactory.create({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      user: config.smtpUsername,
      pass: config.smtpPassword,
      from: config.emailFrom,
    });
    return new ReservedDomainEmailService(smtp);
  }
  return ConsoleMailerAdapterFactory.create();
}
