import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import {
  confirmationSubject,
  RegistrationConfirmation,
} from '@/core/email/templates/registration-confirmation';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { RegistrationsRepository } from '@/modules/registrations/repositories/registrations.repository';
import { Inject, Injectable, Logger } from '@nestjs/common';

/**
 * Sends the confirmation of a newly saved registration (S2-15). It reads what
 * was stored, so the message never reflects a later capacity or event change,
 * and it can never undo or delay the registration: every failure ends in the
 * `email_delivery` row. "Accepted" means the provider took the message, not
 * that it reached a mailbox (data-model.md §3.11).
 */
@Injectable()
export class RegistrationConfirmationService {
  private readonly logger = new Logger(RegistrationConfirmationService.name);
  private readonly sending = new Set<Promise<void>>();

  constructor(
    private readonly repository: RegistrationsRepository,
    private readonly access: ParticipantAccessService,
    @Inject('EmailService') private readonly email: EmailService,
  ) {}

  /** Starts the send and returns at once; the response does not wait for it. */
  dispatch(registrationId: string): void {
    const sending = this.send(registrationId).finally(() =>
      this.sending.delete(sending),
    );
    this.sending.add(sending);
  }

  /** Resolves when sends started so far have been handed over or failed. */
  async settle(): Promise<void> {
    await Promise.all([...this.sending]);
  }

  private async send(registrationId: string): Promise<void> {
    let deliveryId: string | undefined;
    let url: string | undefined;
    try {
      const pending =
        await this.repository.findPendingConfirmation(registrationId);
      if (!pending) return;
      deliveryId = pending.deliveryId;
      const { result } = pending;

      url = await this.access.issueConfirmationLink(pending.accountId);
      const html = await renderEmail(RegistrationConfirmation, {
        eventName: result.event.name,
        terms: result.terms,
        selectedPriceMinor: result.selectedPriceMinor,
        payment: result.paymentInstructions,
        url,
      });
      const sent = await this.email.sendEmail(
        result.email,
        confirmationSubject(result.event.name),
        html,
      );
      if (!sent.sent) throw new Error('E-mail was not handed to the provider');
      await this.repository.markConfirmation(deliveryId, {
        status: 'accepted',
        providerMessageId: sent.messageId,
      });
    } catch (error) {
      const reason = this.sanitize(error, url);
      this.logger.error(
        `Confirmation e-mail for registration ${registrationId} failed: ${reason}`,
      );
      if (!deliveryId) return;
      await this.repository
        .markConfirmation(deliveryId, { status: 'failed', error: reason })
        .catch(() => undefined);
    }
  }

  /** Never keeps the link or its token, which may sit in a provider error. */
  private sanitize(error: unknown, url: string | undefined): string {
    const message = (error as { message?: unknown } | null)?.message;
    let reason = typeof message === 'string' ? message : 'unknown error';
    if (url) {
      const token = new URL(url).searchParams.get('token');
      reason = reason.split(url).join('[redacted]');
      if (token) reason = reason.split(token).join('[redacted]');
    }
    return reason.slice(0, 1000);
  }
}
