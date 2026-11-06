import { brandLogo } from '@/core/email/brand-logo';
import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import {
  ParticipantUpdate,
  participantUpdateSubject,
} from '@/core/email/templates/participant-update';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import {
  ClaimedUpdate,
  ParticipantUpdatesRepository,
} from '@/modules/registrations/repositories/participant-updates.repository';
import { Config } from '@/shared/config/config.service';
import { Inject, Injectable, Logger } from '@nestjs/common';

/**
 * Sends the e-mails queued by saved events (F45-1). The message was written in
 * the event's transaction, so nothing here recomputes the registration, and a
 * failure can never undo the event: it ends in the `email_delivery` row.
 * "Accepted" means the provider took the message, not that it was delivered.
 * A failed send is not retried.
 */
@Injectable()
export class ParticipantUpdateService {
  private readonly logger = new Logger(ParticipantUpdateService.name);
  private readonly sending = new Set<Promise<void>>();

  constructor(
    private readonly repository: ParticipantUpdatesRepository,
    private readonly access: ParticipantAccessService,
    private readonly config: Config,
    @Inject('EmailService') private readonly email: EmailService,
  ) {}

  /** Starts the sends of a registration's queued updates; does not wait. */
  dispatch(registrationId: string): void {
    const sending = this.sendQueued(registrationId)
      .catch((error: unknown) =>
        this.logger.error(
          `Queued updates of registration ${registrationId} were not sent: ${this.sanitize(error, [])}`,
        ),
      )
      .finally(() => this.sending.delete(sending));
    this.sending.add(sending);
  }

  /** Resolves when sends started so far have been handed over or failed. */
  async settle(): Promise<void> {
    await Promise.all([...this.sending]);
  }

  private async sendQueued(registrationId: string): Promise<void> {
    for (const id of await this.repository.findPendingIds(registrationId)) {
      const claimed = await this.repository.claim(id);
      if (claimed) await this.send(claimed);
    }
  }

  private async send(claimed: ClaimedUpdate): Promise<void> {
    const { update } = claimed;
    const secrets: string[] = [];
    try {
      let url = `${this.config.frontendUrl}/my-registrations`;
      if (update.hasMagicLink) {
        url = await this.access.issueConfirmationLink(claimed.accountId);
        secrets.push(url, new URL(url).searchParams.get('token') ?? '');
      }
      const payUrl = `${this.config.frontendUrl}/platba/${update.payment.paymentToken}`;
      secrets.push(update.payment.paymentToken);
      const html = await renderEmail(ParticipantUpdate, {
        update,
        url,
        payUrl,
      });
      const sent = await this.email.sendEmail(
        claimed.recipient,
        participantUpdateSubject(update.reason, update.eventName),
        html,
        [brandLogo],
      );
      if (!sent.sent) throw new Error('E-mail was not handed to the provider');
      await this.repository.mark(claimed.deliveryId, {
        status: 'accepted',
        providerMessageId: sent.messageId,
      });
    } catch (error) {
      const reason = this.sanitize(error, secrets);
      this.logger.error(
        `Update e-mail ${claimed.deliveryId} failed: ${reason}`,
      );
      await this.repository
        .mark(claimed.deliveryId, { status: 'failed', error: reason })
        .catch(() => undefined);
    }
  }

  /** Never keeps a link or token, which may sit in a provider error. */
  private sanitize(error: unknown, secrets: string[]): string {
    const message = (error as { message?: unknown } | null)?.message;
    let reason = typeof message === 'string' ? message : 'unknown error';
    for (const secret of secrets.filter(Boolean)) {
      reason = reason.split(secret).join('[redacted]');
    }
    return reason.slice(0, 1000);
  }
}
