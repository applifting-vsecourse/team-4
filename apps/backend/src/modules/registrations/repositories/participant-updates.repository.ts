import { PrismaService } from '@/core/prisma/prisma.service';
import { ParticipantUpdatePayload } from '@/modules/registrations/domain/participant-update';
import { Injectable } from '@nestjs/common';

export type ClaimedUpdate = {
  deliveryId: string;
  accountId: string;
  recipient: string;
  update: ParticipantUpdatePayload;
};

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
      },
    });
    return {
      deliveryId,
      accountId: row.participantAccountId ?? '',
      recipient: row.recipientEmail,
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
}
