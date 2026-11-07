import {
  InlineImage,
  SendResult,
} from '@/core/email/interfaces/email-service.interface';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { ParticipantUpdatesRepository } from '@/modules/registrations/repositories/participant-updates.repository';
import { ParticipantUpdateService } from '@/modules/registrations/services/participant-update.service';
import { RegistrationConfirmationService } from '@/modules/registrations/services/registration-confirmation.service';
import { Config } from '@/shared/config/config.service';
import { Provider } from '@nestjs/common';

export type SentMail = { to: string; subject: string; html: string };

/** A stand-in mail provider the test can read and make fail. */
export class Mailbox {
  sent: SentMail[] = [];
  /** The inline images of each sent message, in the same order. */
  images: InlineImage[][] = [];
  failWith: string | null = null;
  /** A provider that repeats the message body in its error. */
  echoBodyInError = false;

  reset(): void {
    this.sent = [];
    this.images = [];
    this.failWith = null;
    this.echoBodyInError = false;
  }

  sendEmail(
    to: string,
    subject: string,
    html: string,
    inlineImages: InlineImage[] = [],
  ): Promise<SendResult> {
    if (this.failWith) {
      const detail = this.echoBodyInError ? ` ${html}` : '';
      return Promise.reject(new Error(this.failWith + detail));
    }
    this.sent.push({ to, subject, html });
    this.images.push(inlineImages);
    return Promise.resolve({
      sent: true,
      messageId: `msg-${this.sent.length}`,
    });
  }
}

/** Everything `RegistrationsService` needs to send its confirmation. */
export const confirmationProviders = (mailbox: Mailbox): Provider[] => [
  RegistrationConfirmationService,
  ...updateProviders(mailbox),
];

/** Everything the services that queue participant updates (F45-1) need to send them. */
export const updateProviders = (mailbox: Mailbox): Provider[] => [
  ParticipantUpdateService,
  ParticipantUpdatesRepository,
  ParticipantAccessService,
  ParticipantAccessRepository,
  {
    provide: Config,
    useValue: { frontendUrl: 'http://app.test', nodeEnv: 'test' },
  },
  { provide: 'EmailService', useValue: mailbox },
];
