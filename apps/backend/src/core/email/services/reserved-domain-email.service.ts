import {
  EmailService,
  InlineImage,
  SendResult,
} from '@/core/email/interfaces/email-service.interface';
import { Logger } from '@nestjs/common';

/**
 * Top-level domains and domains that RFC 2606 / 6761 reserve for tests and
 * documentation; mail to them can never be delivered.
 */
const RESERVED_TLDS = ['test', 'invalid', 'example', 'localhost'];
const RESERVED_DOMAINS = ['example.com', 'example.net', 'example.org'];

export function isReservedAddress(address: string): boolean {
  const domain = address.trim().toLowerCase().split('@').pop() ?? '';
  const tld = domain.split('.').pop() ?? '';
  return (
    RESERVED_TLDS.includes(tld) ||
    RESERVED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))
  );
}

/**
 * Does not hand mail for undeliverable test addresses (e.g. the e2e suite's
 * `@example.test`) to the real provider: it only logs it and reports success,
 * the way the console mailer does, so callers behave the same either way.
 */
export class ReservedDomainEmailService implements EmailService {
  private readonly logger = new Logger(ReservedDomainEmailService.name);

  constructor(private readonly inner: EmailService) {}

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    inlineImages?: InlineImage[],
  ): Promise<SendResult> {
    if (isReservedAddress(to)) {
      this.logger.log(
        `Email "${subject}" not sent: recipient is on a reserved test domain`,
      );
      return { sent: true, messageId: null };
    }
    return this.inner.sendEmail(to, subject, html, inlineImages);
  }
}
