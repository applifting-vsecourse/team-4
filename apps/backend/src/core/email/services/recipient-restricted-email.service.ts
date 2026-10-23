import {
  EmailService,
  SendResult,
} from '@/core/email/interfaces/email-service.interface';
import { Logger } from '@nestjs/common';

/**
 * Delivers only to a single allowed address and drops everything else with a
 * warning. Used while Resend runs on its sandbox sender, which can only reach
 * the account owner's address.
 */
export class RecipientRestrictedEmailService implements EmailService {
  private readonly logger = new Logger(RecipientRestrictedEmailService.name);
  private readonly allowedRecipient: string;

  constructor(
    private readonly inner: EmailService,
    allowedRecipient: string,
  ) {
    this.allowedRecipient = normalize(allowedRecipient);
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<SendResult> {
    if (normalize(to) !== this.allowedRecipient) {
      this.logger.warn(
        `Email "${subject}" not sent: recipient is not the allowed address (EMAIL_ALLOWED_RECIPIENT)`,
      );
      return { sent: false, messageId: null };
    }
    return this.inner.sendEmail(to, subject, html);
  }
}

function normalize(address: string): string {
  return address.trim().toLowerCase();
}
