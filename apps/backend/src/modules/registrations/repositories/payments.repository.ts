import { PrismaService } from '@/core/prisma/prisma.service';
import { toDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { PaymentInput } from '@/modules/registrations/domain/payment';
import { queueParticipantUpdate } from '@/modules/registrations/repositories/participant-update-queue';
import { Injectable } from '@nestjs/common';

export type StoredPayment = {
  registrationId: string;
  amountMinor: number;
  receivedOn: Date;
};

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The payment saved under this key, in any organization. */
  async findBySubmissionKey(
    submissionKey: string,
  ): Promise<StoredPayment | null> {
    return this.prisma.payment.findUnique({
      where: { submissionKey },
      select: { registrationId: true, amountMinor: true, receivedOn: true },
    });
  }

  /** Whether the registration belongs to the event of an organization of the caller (§3.2). */
  async registrationInScope(
    scope: EventScope,
    registrationId: string,
  ): Promise<boolean> {
    const found = await this.prisma.registration.findFirst({
      where: {
        id: registrationId,
        eventId: scope.eventId,
        organizationId: scope.organizationId,
        event: { organization: { ownerId: scope.ownerId } },
      },
      select: { id: true },
    });
    return found !== null;
  }

  /** Saves the payment and queues its e-mail; throws a unique violation when the key is used. */
  async create(
    scope: EventScope,
    registrationId: string,
    input: PaymentInput,
    recordedById: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          organizationId: scope.organizationId,
          registrationId,
          submissionKey: input.submissionKey,
          amountMinor: input.amountMinor,
          receivedOn: toDate(input.receivedOn),
          recordedById,
        },
        select: { id: true },
      });
      await queueParticipantUpdate(tx, {
        registrationId,
        reason: 'paymentRecorded',
        dedupKey: `payment:${payment.id}`,
        paymentId: payment.id,
      });
    });
  }
}
