import { PrismaService } from '@/core/prisma/prisma.service';
import { ResultEventPayload } from '@/modules/accommodation/domain/term-decision';
import {
  ParticipantUpdatePayload,
  resultReason,
} from '@/modules/registrations/domain/participant-update';
import { queueParticipantUpdate } from '@/modules/registrations/repositories/participant-update-queue';
import { Injectable } from '@nestjs/common';

export type ClaimedUpdate = {
  deliveryId: string;
  accountId: string;
  recipient: string;
  /** Opens the payment page; read when sending, never kept in the payload. */
  paymentToken: string;
  update: ParticipantUpdatePayload;
};

export type ResultEvent = {
  id: string;
  registrationId: string;
  payload: ResultEventPayload;
};

/** One result event is mailed once: the key is its id. */
export const resultKey = (eventId: string): string => `result:${eventId}`;

@Injectable()
export class ParticipantUpdatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The queued updates of a registration, oldest first. */
  async findPendingIds(registrationId: string): Promise<string[]> {
    const rows = await this.prisma.emailDelivery.findMany({
      where: {
        registrationId,
        type: 'participant_update',
        status: 'pending',
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /**
   * Takes one queued update for sending. Of concurrent dispatches only one
   * wins, so a message goes out at most once.
   */
  async claim(deliveryId: string): Promise<ClaimedUpdate | null> {
    const taken = await this.prisma.emailDelivery.updateMany({
      where: { id: deliveryId, status: 'pending' },
      data: { status: 'sending' },
    });
    if (taken.count === 0) return null;
    const row = await this.prisma.emailDelivery.findUniqueOrThrow({
      where: { id: deliveryId },
      select: {
        recipientEmail: true,
        participantAccountId: true,
        payload: true,
        registration: { select: { paymentToken: true } },
      },
    });
    return {
      deliveryId,
      accountId: row.participantAccountId ?? '',
      recipient: row.recipientEmail,
      paymentToken: row.registration?.paymentToken ?? '',
      update: row.payload as unknown as ParticipantUpdatePayload,
    };
  }

  async mark(
    deliveryId: string,
    outcome:
      | { status: 'accepted'; providerMessageId: string | null }
      | { status: 'failed'; error: string },
  ): Promise<void> {
    await this.prisma.emailDelivery.update({
      where: { id: deliveryId },
      data:
        outcome.status === 'accepted'
          ? {
              status: 'accepted',
              providerMessageId: outcome.providerMessageId,
            }
          : { status: 'failed', errorMessage: outcome.error },
    });
  }

  /**
   * Decision results (S3-02) that have no delivery yet, oldest first. The
   * delivery row is the only mark: the S3-02 table is read, never changed.
   */
  async findUnmailedResults(limit: number): Promise<ResultEvent[]> {
    const rows = await this.prisma.$queryRaw<
      { id: string; registrationId: string; payload: ResultEventPayload }[]
    >`
      SELECT e."id", e."registrationId", e."payload"
      FROM "registration_result_event" e
      WHERE NOT EXISTS (
        SELECT 1 FROM "email_delivery" d
        WHERE d."dedupKey" = 'result:' || e."id"::text)
      ORDER BY e."createdAt", e."id"
      LIMIT ${limit}`;
    return rows;
  }

  /** Queues the e-mail of a result; false when it was queued before. */
  queueResult(event: ResultEvent): Promise<boolean> {
    return this.prisma.$transaction((tx) =>
      queueParticipantUpdate(tx, {
        registrationId: event.registrationId,
        reason: resultReason(event.payload),
        dedupKey: resultKey(event.id),
        result: event.payload,
      }),
    );
  }
}
