import { ResendConfig } from '@/core/email/adapters/resend/interfaces/resend-config.interface';
import {
  EmailService,
  InlineImage,
  SendResult,
} from '@/core/email/interfaces/email-service.interface';
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendAdapter implements EmailService {
  private readonly logger = new Logger(ResendAdapter.name);
  private readonly client: Resend;

  constructor(private readonly config: ResendConfig) {
    this.client = new Resend(config.apiKey);
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    inlineImages: InlineImage[] = [],
  ): Promise<SendResult> {
    const { data, error } = await this.client.emails.send({
      from: this.config.from,
      to,
      subject,
      html,
      attachments:
        inlineImages.length === 0
          ? undefined
          : inlineImages.map((image) => ({
              filename: image.filename,
              content: image.content,
              contentType: image.contentType,
              contentId: image.cid,
            })),
    });

    if (error) {
      this.logger.error(`Resend delivery failed: ${error.message}`, error);
      throw new Error(`Resend delivery failed: ${error.message}`);
    }
    return { sent: true, messageId: data?.id ?? null };
  }
}
