import { ResendConfig } from '@/core/email/adapters/resend/interfaces/resend-config.interface';
import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendAdapter implements EmailService {
  private readonly logger = new Logger(ResendAdapter.name);
  private readonly client: Resend;

  constructor(private readonly config: ResendConfig) {
    this.client = new Resend(config.apiKey);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.config.from,
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Resend delivery failed: ${error.message}`, error);
      throw new Error(`Resend delivery failed: ${error.message}`);
    }
  }
}
