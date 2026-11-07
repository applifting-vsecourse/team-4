import { PrismaService } from '@/core/prisma/prisma.service';
import { toDate } from '@/modules/events/domain/calendar-date';
import { todayInPrague } from '@/modules/registrations/domain/payment';
import {
  checkQrPayment,
  QrPaymentCheck,
} from '@/modules/registrations/domain/qr-payment';
import { queueParticipantUpdate } from '@/modules/registrations/repositories/participant-update-queue';
import { Injectable } from '@nestjs/common';

export type QrPaymentPage = {
  registrationId: string;
  eventName: string;
  balanceMinor: number;
};

export type QrPaymentOutcome =
  | { kind: 'unavailable' }
  | { kind: 'key_reused' }
  | { kind: Exclude<QrPaymentCheck, 'ok'>; balanceMinor: number }
  | {
      kind: 'paid';
      /** False when this repeats a payment that was already saved. */
      created: boolean;
      paidMinor: number;
      balanceMinor: number;
      /** For sending the queued e-mail once the payment is saved. */
      registrationId: string;
    };

/** The registration is reached by its payment token only; nothing else is read. */
@Injectable()
export class QrPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(token: string): Promise<QrPaymentPage | null> {
    const row = await this.prisma.registration.findUnique({
      where: { paymentToken: token },
      select: {
        id: true,
        event: { select: { name: true } },
        terms: { select: { status: true, priceMinor: true } },
        payments: { select: { amountMinor: true } },
      },
    });
    if (!row) return null;
    return {
      registrationId: row.id,
      eventName: row.event.name,
      balanceMinor: balanceOf(row),
    };
  }

  /**
   * Records one payment under a row lock on the registration, so concurrent
   * payments are checked one after another against the balance they leave.
   */
  async pay(
    token: string,
    submissionKey: string,
    amountMinor: number,
  ): Promise<QrPaymentOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string; organizationId: string }[]
      >`
        SELECT "id", "organizationId" FROM "registration"
        WHERE "paymentToken" = ${token} FOR UPDATE`;
      const registration = locked[0];
      if (!registration) return { kind: 'unavailable' };

      const row = await tx.registration.findUniqueOrThrow({
        where: { id: registration.id },
        select: {
          terms: { select: { status: true, priceMinor: true } },
          payments: { select: { amountMinor: true } },
        },
      });
      const balanceMinor = balanceOf(row);

      const saved = await tx.payment.findUnique({
        where: { submissionKey },
        select: { registrationId: true, amountMinor: true, source: true },
      });
      if (saved) {
        // A retry after a lost response must answer the same, even once the
        // debt it paid is gone.
        const isSame =
          saved.registrationId === registration.id &&
          saved.amountMinor === amountMinor &&
          saved.source === 'qr_link';
        return isSame
          ? {
              kind: 'paid',
              created: false,
              paidMinor: amountMinor,
              balanceMinor,
              registrationId: registration.id,
            }
          : { kind: 'key_reused' };
      }

      const check = checkQrPayment(balanceMinor, amountMinor);
      if (check !== 'ok') return { kind: check, balanceMinor };

      const payment = await tx.payment.create({
        data: {
          organizationId: registration.organizationId,
          registrationId: registration.id,
          submissionKey,
          amountMinor,
          receivedOn: toDate(todayInPrague()),
          source: 'qr_link',
        },
        select: { id: true },
      });
      await queueParticipantUpdate(tx, {
        registrationId: registration.id,
        reason: 'paymentRecorded',
        dedupKey: `payment:${payment.id}`,
        paymentId: payment.id,
      });
      return {
        kind: 'paid',
        created: true,
        paidMinor: amountMinor,
        balanceMinor: balanceMinor - amountMinor,
        registrationId: registration.id,
      };
    });
  }
}

const balanceOf = (row: {
  terms: { status: string; priceMinor: number }[];
  payments: { amountMinor: number }[];
}): number =>
  row.terms
    .filter((term) => term.status === 'confirmed')
    .reduce((sum, term) => sum + term.priceMinor, 0) -
  row.payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
