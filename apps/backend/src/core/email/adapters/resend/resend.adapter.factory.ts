import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { ResendConfig } from './interfaces/resend-config.interface';
import { ResendAdapter } from './services/resend-adapter';

export class ResendAdapterFactory {
  static create(config: ResendConfig): EmailService {
    return new ResendAdapter(config);
  }
}
