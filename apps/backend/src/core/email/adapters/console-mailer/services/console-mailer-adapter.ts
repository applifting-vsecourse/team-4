import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConsoleMailerAdapter implements EmailService {
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    console.log(`
      ====== Email Sent ======
      To: ${to}
      Subject: ${subject}
      html:
      ${html}
      ========================
    `);
  }
}
