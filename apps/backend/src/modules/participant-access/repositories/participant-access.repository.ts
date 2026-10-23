import { PrismaService } from '@/core/prisma/prisma.service';
import {
  LINK_LIMIT,
  MAGIC_LINK_TTL_MS,
  ParticipantIdentity,
  SESSION_TTL_MS,
  withinLimitWindow,
} from '@/modules/participant-access/domain/participant-access';
import { Injectable } from '@nestjs/common';

export type IssuedLink = { accountId: string; deliveryId: string };

@Injectable()
export class ParticipantAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores a link (by hash) and its pending delivery for an account that has
   * registrations; `null` for an unknown e-mail or an exhausted limit, which
   * the caller must not tell apart. The account row is locked, so concurrent
   * requests count each other.
   */
  issueLink(
    email: string,
    tokenHash: string,
    now: Date,
  ): Promise<IssuedLink | null> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.participantAccount.findFirst({
        where: { email, registrations: { some: {} } },
        select: { id: true },
      });
      if (!account) return null;

      await tx.$queryRaw`SELECT id FROM participant_account WHERE id = ${account.id}::uuid FOR UPDATE`;
      const recent = await tx.participantMagicLink.count({
        where: {
          participantAccountId: account.id,
          createdAt: { gt: withinLimitWindow(now) },
        },
      });
      if (recent >= LINK_LIMIT) return null;

      await tx.participantMagicLink.create({
        data: {
          participantAccountId: account.id,
          tokenHash,
          createdAt: now,
          expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS),
        },
      });
      const delivery = await tx.emailDelivery.create({
        data: {
          type: 'participant_magic_link',
          recipientEmail: email,
          participantAccountId: account.id,
        },
        select: { id: true },
      });
      return { accountId: account.id, deliveryId: delivery.id };
    });
  }

  /**
   * Stores a link (by hash) for an account that was just registered, to be
   * sent inside its confirmation e-mail. No delivery row (the confirmation
   * has its own) and no limit check: the participant did not ask for it.
   */
  async issueConfirmationLink(
    accountId: string,
    tokenHash: string,
    now: Date,
  ): Promise<void> {
    await this.prisma.participantMagicLink.create({
      data: {
        participantAccountId: accountId,
        tokenHash,
        createdAt: now,
        expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS),
      },
    });
  }

  /**
   * Spends a link exactly once and opens a session. The conditional update is
   * a single atomic statement: of concurrent uses one wins, the rest see the
   * link already consumed. `null` when the link is unknown, used or expired.
   */
  consumeLink(
    linkHash: string,
    sessionHash: string,
    now: Date,
  ): Promise<{ expiresAt: Date } | null> {
    return this.prisma.$transaction(async (tx) => {
      const spent = await tx.participantMagicLink.updateMany({
        where: {
          tokenHash: linkHash,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (spent.count === 0) return null;

      const link = await tx.participantMagicLink.findUniqueOrThrow({
        where: { tokenHash: linkHash },
        select: { participantAccountId: true },
      });
      const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
      await tx.participantSession.create({
        data: {
          participantAccountId: link.participantAccountId,
          tokenHash: sessionHash,
          createdAt: now,
          expiresAt,
        },
      });
      return { expiresAt };
    });
  }

  async findIdentity(
    sessionHash: string,
    now: Date,
  ): Promise<ParticipantIdentity | null> {
    const session = await this.prisma.participantSession.findFirst({
      where: {
        tokenHash: sessionHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        participantAccount: { select: { id: true, email: true } },
      },
    });
    if (!session) return null;
    return new ParticipantIdentity(
      session.participantAccount.id,
      session.participantAccount.email,
    );
  }

  async revokeSession(sessionHash: string, now: Date): Promise<void> {
    await this.prisma.participantSession.updateMany({
      where: { tokenHash: sessionHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async markDelivery(
    id: string,
    result: { status: 'accepted' } | { status: 'failed'; error: string },
  ): Promise<void> {
    await this.prisma.emailDelivery.update({
      where: { id },
      data:
        result.status === 'accepted'
          ? { status: 'accepted' }
          : { status: 'failed', errorMessage: result.error },
    });
  }
}
