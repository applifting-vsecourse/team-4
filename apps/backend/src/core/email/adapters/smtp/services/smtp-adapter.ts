import { SMTPConfig } from '@/core/email/adapters/smtp/interfaces/smtp-config.interface';
import {
  EmailService,
  InlineImage,
  SendResult,
} from '@/core/email/interfaces/email-service.interface';
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SMTPAdapter implements EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: SMTPConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    inlineImages: InlineImage[] = [],
  ): Promise<SendResult> {
    const info = await this.transporter.sendMail({
      from: this.config.user,
      to,
      subject,
      html,
      attachments: inlineImages.map((image) => ({
        filename: image.filename,
        content: image.content,
        contentType: image.contentType,
        cid: image.cid,
      })),
    });
    return { sent: true, messageId: info.messageId ?? null };
  }
}
