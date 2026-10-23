import { SendResult } from '@/core/email/interfaces/email-service.interface';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { RegistrationConfirmationService } from '@/modules/registrations/services/registration-confirmation.service';
import { Config } from '@/shared/config/config.service';
import { Provider } from '@nestjs/common';

export type SentMail = { to: string; subject: string; html: string };

/** A stand-in mail provider the test can read and make fail. */
export class Mailbox {
  sent: SentMail[] = [];
  failWith: string | null = null;
  /** A provider that repeats the message body in its error. */
  echoBodyInError = false;

  reset(): void {
    this.sent = [];
    this.failWith = null;
    this.echoBodyInError = false;
  }

  sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
    if (this.failWith) {
      const detail = this.echoBodyInError ? ` ${html}` : '';
      return Promise.reject(new Error(this.failWith + detail));
    }
    this.sent.push({ to, subject, html });
    return Promise.resolve({
      sent: true,
      messageId: `msg-${this.sent.length}`,
    });
  }
}

/** Everything `RegistrationsService` needs to send its confirmation. */
export const confirmationProviders = (mailbox: Mailbox): Provider[] => [
  RegistrationConfirmationService,
  ParticipantAccessService,
  ParticipantAccessRepository,
  {
    provide: Config,
    useValue: { frontendUrl: 'http://app.test', nodeEnv: 'test' },
  },
  { provide: 'EmailService', useValue: mailbox },
];
