import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { ParticipantMagicLink } from '@/core/email/templates/participant-magic-link';
import {
  hashToken,
  isWellFormedToken,
  newToken,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { normalizeEmail } from '@/modules/registrations/domain/registration';
import { Config } from '@/shared/config/config.service';
import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

export const magicLinkInvalid = (): UnauthorizedException =>
  new UnauthorizedException({
    statusCode: 401,
    code: 'magic_link_invalid',
    message: 'Odkaz už není platný. Vyžádejte si nový přihlašovací odkaz.',
  });

export type OpenedSession = { token: string; expiresAt: Date };

@Injectable()
export class ParticipantAccessService {
  private readonly logger = new Logger(ParticipantAccessService.name);
  private readonly sending = new Set<Promise<void>>();

  constructor(
    private readonly repository: ParticipantAccessRepository,
    private readonly config: Config,
    @Inject('EmailService') private readonly email: EmailService,
  ) {}

  /**
   * Issues a link for an e-mail with registrations unless the limit is used
   * up. Returns nothing either way, and the e-mail goes out after the
   * response, so neither the answer nor its timing tells whether it exists.
   */
  async requestLink(rawEmail: string, now = new Date()): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const token = newToken();
    const issued = await this.repository.issueLink(
      email,
      hashToken(token),
      now,
    );
    if (!issued) return;

    const sending = this.deliver(issued.deliveryId, email, token).finally(() =>
      this.sending.delete(sending),
    );
    this.sending.add(sending);
  }

  /** Resolves when e-mails started so far have been handed over or failed. */
  async settleDeliveries(): Promise<void> {
    await Promise.all([...this.sending]);
  }

  async openSession(
    linkToken: string,
    now = new Date(),
  ): Promise<OpenedSession> {
    if (!isWellFormedToken(linkToken)) throw magicLinkInvalid();
    const token = newToken();
    const opened = await this.repository.consumeLink(
      hashToken(linkToken),
      hashToken(token),
      now,
    );
    if (!opened) throw magicLinkInvalid();
    return { token, expiresAt: opened.expiresAt };
  }

  /** `null` for a missing, unknown, revoked or expired session. */
  async identify(
    sessionToken: string | undefined,
    now = new Date(),
  ): Promise<ParticipantIdentity | null> {
    if (!sessionToken || !isWellFormedToken(sessionToken)) return null;
    return this.repository.findIdentity(hashToken(sessionToken), now);
  }

  async closeSession(
    sessionToken: string | undefined,
    now = new Date(),
  ): Promise<void> {
    if (!sessionToken || !isWellFormedToken(sessionToken)) return;
    await this.repository.revokeSession(hashToken(sessionToken), now);
  }

  private async deliver(
    deliveryId: string,
    to: string,
    token: string,
  ): Promise<void> {
    try {
      const url = `${this.config.frontendUrl}/my-registrations/verify?token=${token}`;
      const html = await renderEmail(ParticipantMagicLink, { url });
      await this.email.sendEmail(to, 'Přihlašovací odkaz do akc.io', html);
      await this.repository.markDelivery(deliveryId, { status: 'accepted' });
    } catch (error) {
      // Handed to the provider is not delivered; a failure is kept for the
      // operator, and never with the token that was in the message.
      const message = (error as { message?: unknown } | null)?.message;
      const reason = (typeof message === 'string' ? message : 'unknown error')
        .split(token)
        .join('[redacted]')
        .slice(0, 1000);
      this.logger.error(`Magic link e-mail ${deliveryId} failed: ${reason}`);
      await this.repository
        .markDelivery(deliveryId, { status: 'failed', error: reason })
        .catch(() => undefined);
    }
  }
}
