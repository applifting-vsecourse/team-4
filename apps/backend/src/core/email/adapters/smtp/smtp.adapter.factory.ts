import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { SMTPConfig } from './interfaces/smtp-config.interface';
import { SMTPAdapter } from './services/smtp-adapter';

export class SMTPAdapterFactory {
  static create(config: SMTPConfig): EmailService {
    return new SMTPAdapter(config);
  }
}
