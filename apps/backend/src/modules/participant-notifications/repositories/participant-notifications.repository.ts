import { PrismaService } from '@/core/prisma/prisma.service';
import { ResultEventPayload } from '@/modules/accommodation/domain/term-decision';
import {
  changeTerms,
  decisionTerms,
  newestFirst,
  ParticipantNotification,
} from '@/modules/participant-notifications/domain/participant-notification';
import { ChangeSummary } from '@/modules/registrations/domain/registration-change';
import { Injectable } from '@nestjs/common';

/** A change request becomes a notification once the organizer decided it. */
const DECIDED = ['approved', 'rejected'] as const;

const EVENT_NAME = {
  registration: { select: { event: { select: { name: true } } } },
} as const;

@Injectable()
export class ParticipantNotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The notifications of the account's own registrations that it did not
   * dismiss, newest first. Every saved event is one row of its own table, so
   * it is listed once.
   */
  async list(accountId: string): Promise<ParticipantNotification[]> {
    const own = { registration: { participantAccountId: accountId } };
    const [decisions, changes, payments, states] = await Promise.all([
      this.prisma.registrationResultEvent.findMany({
        where: own,
        select: {
          id: true,
          registrationId: true,
          payload: true,
          createdAt: true,
          ...EVENT_NAME,
        },
      }),
      this.prisma.registrationChange.findMany({
        where: { ...own, status: { in: [...DECIDED] } },
        select: {
          id: true,
          registrationId: true,
          status: true,
          summary: true,
          decidedAt: true,
          createdAt: true,
          ...EVENT_NAME,
        },
      }),
      this.prisma.payment.findMany({
        where: own,
        select: {
          id: true,
          registrationId: true,
          amountMinor: true,
          createdAt: true,
          ...EVENT_NAME,
        },
      }),
      this.prisma.participantNotificationState.findMany({
        where: { participantAccountId: accountId },
        select: { sourceId: true, readAt: true, dismissedAt: true },
      }),
    ]);

    const state = new Map(states.map((row) => [row.sourceId, row]));
    const notifications: ParticipantNotification[] = [
      ...decisions.map((row) => ({
        id: row.id,
        kind: 'decision' as const,
        registrationId: row.registrationId,
        eventName: row.registration.event.name,
        at: row.createdAt,
        terms: decisionTerms(row.payload as unknown as ResultEventPayload),
        amountMinor: null,
      })),
      ...changes.map((row) => {
        const outcome = row.status === 'approved' ? 'approved' : 'rejected';
        return {
          id: row.id,
          kind:
            outcome === 'approved'
              ? ('changeApproved' as const)
              : ('changeRejected' as const),
          registrationId: row.registrationId,
          eventName: row.registration.event.name,
          at: row.decidedAt ?? row.createdAt,
          terms: changeTerms(row.summary as unknown as ChangeSummary, outcome),
          amountMinor: null,
        };
      }),
      ...payments.map((row) => ({
        id: row.id,
        kind: 'payment' as const,
        registrationId: row.registrationId,
        eventName: row.registration.event.name,
        at: row.createdAt,
        terms: [],
        amountMinor: row.amountMinor,
      })),
    ].map((notification) => ({
      ...notification,
      isRead: state.get(notification.id)?.readAt != null,
    }));

    return notifications
      .filter((notification) => !state.get(notification.id)?.dismissedAt)
      .sort(newestFirst);
  }

  /** Whether the id is a notification of the account's own registrations. */
  async isOwn(accountId: string, id: string): Promise<boolean> {
    const own = { id, registration: { participantAccountId: accountId } };
    const counts = await Promise.all([
      this.prisma.registrationResultEvent.count({ where: own }),
      this.prisma.registrationChange.count({
        where: { ...own, status: { in: [...DECIDED] } },
      }),
      this.prisma.payment.count({ where: own }),
    ]);
    return counts.some((count) => count > 0);
  }

  /** Read once; reading again keeps the first time. */
  async markRead(accountId: string, ids: string[], at: Date): Promise<void> {
    await this.prisma.participantNotificationState.createMany({
      data: ids.map((sourceId) => ({
        participantAccountId: accountId,
        sourceId,
        readAt: at,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Hidden for good. A row exists only once the notification was read, so an
   * existing row already has its `readAt`.
   */
  async dismiss(accountId: string, id: string, at: Date): Promise<void> {
    await this.prisma.participantNotificationState.upsert({
      where: {
        participantAccountId_sourceId: {
          participantAccountId: accountId,
          sourceId: id,
        },
      },
      create: {
        participantAccountId: accountId,
        sourceId: id,
        readAt: at,
        dismissedAt: at,
      },
      update: { dismissedAt: at },
    });
  }
}
