import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  ManagedRegistrationModel,
  RegistrationFilter,
} from '@/modules/registrations/domain/managed-registration';
import { Injectable } from '@nestjs/common';

const registrationSelect = {
  id: true,
  receivedAt: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  variableSymbol: true,
  paymentReminderAt: true,
  terms: {
    orderBy: [{ term: { startDate: 'asc' } }, { termId: 'asc' }],
    select: {
      termId: true,
      status: true,
      priceMinor: true,
      term: { select: { label: true, startDate: true, endDate: true } },
    },
  },
  payments: {
    orderBy: [{ receivedOn: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, receivedOn: true, amountMinor: true },
  },
} satisfies Prisma.RegistrationSelect;

const toModel = (
  row: Prisma.RegistrationGetPayload<{ select: typeof registrationSelect }>,
): ManagedRegistrationModel =>
  new ManagedRegistrationModel(
    row.id,
    row.receivedAt,
    row.firstName,
    row.lastName,
    row.email,
    row.phone,
    row.terms.map((term) => ({
      termId: term.termId,
      label: term.term.label,
      startDate: fromDate(term.term.startDate),
      endDate: fromDate(term.term.endDate),
      priceMinor: term.priceMinor,
      status: term.status,
    })),
    row.variableSymbol,
    row.paymentReminderAt,
    row.payments.map((payment) => ({
      id: payment.id,
      receivedOn: fromDate(payment.receivedOn),
      amountMinor: payment.amountMinor,
    })),
  );

/** Registrations of the scope's event only, of an organization of the caller (§3.2). */
const inScope = (scope: EventScope): Prisma.RegistrationWhereInput => ({
  eventId: scope.eventId,
  organizationId: scope.organizationId,
  event: { organization: { ownerId: scope.ownerId } },
});

@Injectable()
export class EventRegistrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Null when the event is not in an organization of the caller. Term and
   * status are matched on one registration term (data-model.md §3.10); the
   * payment state is derived, so the service filters on it.
   */
  async findAll(
    scope: EventScope,
    filter: Pick<RegistrationFilter, 'termId' | 'status'>,
  ): Promise<{
    total: number;
    registrations: ManagedRegistrationModel[];
  } | null> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: scope.eventId,
        organizationId: scope.organizationId,
        organization: { ownerId: scope.ownerId },
      },
      select: { id: true },
    });
    if (!event) return null;
    const byTerm =
      filter.termId || filter.status
        ? { terms: { some: { termId: filter.termId, status: filter.status } } }
        : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.registration.count({ where: inScope(scope) }),
      this.prisma.registration.findMany({
        where: { ...inScope(scope), ...byTerm },
        orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
        select: registrationSelect,
      }),
    ]);
    return { total, registrations: rows.map(toModel) };
  }

  /** Null for a registration of another event, organization or owner. */
  async findOne(
    scope: EventScope,
    registrationId: string,
  ): Promise<ManagedRegistrationModel | null> {
    const row = await this.prisma.registration.findFirst({
      where: { id: registrationId, ...inScope(scope) },
      select: registrationSelect,
    });
    return row ? toModel(row) : null;
  }
}
