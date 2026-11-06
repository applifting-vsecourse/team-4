import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { answerChanged } from '@/modules/accommodation/repositories/determination-lapse';
import { termInputsChanged } from '@/modules/accommodation/repositories/term-inputs';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { GenderAnswer } from '@/modules/registrations/domain/gender';
import {
  ManagedRegistrationDetailModel,
  ManagedRegistrationModel,
  RegistrationFilter,
} from '@/modules/registrations/domain/managed-registration';
import {
  needsOf,
  needsSelect,
  normalizeNeeds,
  RegistrationNeeds,
  sameNeeds,
} from '@/modules/registrations/domain/registration-needs';
import { Injectable } from '@nestjs/common';

const registrationSelect = {
  id: true,
  receivedAt: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  gender: true,
  genderOther: true,
  variableSymbol: true,
  paymentReminderAt: true,
  // Whether the accommodation must be determined by hand (F64, S3-01).
  event: {
    select: {
      accommodationRules: {
        select: { hardAttribute: true, nonDeterminingValues: true },
      },
    },
  },
  accommodationManualValue: { select: { value: true, basedOnAnswer: true } },
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
    select: { id: true, receivedOn: true, amountMinor: true, source: true },
  },
} satisfies Prisma.RegistrationSelect;

/** The list leaves out what only the detail shows (F63). */
const detailSelect = {
  ...registrationSelect,
  version: true,
  ...needsSelect,
} satisfies Prisma.RegistrationSelect;

const registrationOf = (
  row: Prisma.RegistrationGetPayload<{ select: typeof registrationSelect }>,
): ConstructorParameters<typeof ManagedRegistrationModel> => [
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
    source: payment.source,
  })),
  row.gender,
  row.genderOther,
  {
    hardAttribute: row.event.accommodationRules?.hardAttribute
      ? {
          attribute: row.event.accommodationRules.hardAttribute,
          nonDeterminingValues: row.event.accommodationRules.nonDeterminingValues,
        }
      : null,
    manualValue: row.accommodationManualValue,
  },
];

const toModel = (
  row: Prisma.RegistrationGetPayload<{ select: typeof registrationSelect }>,
): ManagedRegistrationModel =>
  new ManagedRegistrationModel(...registrationOf(row));

const toDetail = (
  row: Prisma.RegistrationGetPayload<{ select: typeof detailSelect }>,
): ManagedRegistrationDetailModel =>
  new ManagedRegistrationDetailModel(
    registrationOf(row),
    needsOf(row),
    row.version,
  );

/** Registrations of the scope's event only, of an organization of the caller (§3.2). */
const inScope = (scope: EventScope): Prisma.RegistrationWhereInput => ({
  eventId: scope.eventId,
  organizationId: scope.organizationId,
  event: { organization: { ownerId: scope.ownerId } },
});

export type NeedsCorrection =
  | { kind: 'corrected'; registration: ManagedRegistrationDetailModel }
  | { kind: 'not_found' }
  /** The registration changed after the organizer loaded it. */
  | { kind: 'stale' }
  /** A participant change request waits for a decision. */
  | { kind: 'change_pending' };

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
  ): Promise<ManagedRegistrationDetailModel | null> {
    const row = await this.prisma.registration.findFirst({
      where: { id: registrationId, ...inScope(scope) },
      select: detailSelect,
    });
    return row ? toDetail(row) : null;
  }

  /**
   * The organizer's correction of the needs (F63): only these fields, at once,
   * on the version the organizer saw, and not while a participant change
   * request waits (like the gender correction, F64). The registration row is
   * locked, so a participant change cannot slip in between.
   */
  async correctNeeds(
    scope: EventScope,
    registrationId: string,
    needs: RegistrationNeeds,
    expectedVersion: number,
  ): Promise<NeedsCorrection> {
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.registration.findFirst({
        where: { id: registrationId, ...inScope(scope) },
        select: { id: true },
      });
      if (!owned) return { kind: 'not_found' };
      await tx.$queryRaw`
        SELECT "id" FROM "registration"
        WHERE "id" = ${registrationId}::uuid FOR UPDATE`;
      const current = await tx.registration.findUniqueOrThrow({
        where: { id: registrationId },
        select: detailSelect,
      });
      if (current.version !== expectedVersion) return { kind: 'stale' };
      // A waiting request was proposed on the current needs; decide it first.
      const pending = await tx.registrationChange.count({
        where: { registrationId, status: 'pending' },
      });
      if (pending > 0) return { kind: 'change_pending' };
      if (sameNeeds(needsOf(current), needs)) {
        return { kind: 'corrected', registration: toDetail(current) };
      }
      const updated = await tx.registration.update({
        where: { id: registrationId },
        data: { ...normalizeNeeds(needs), version: { increment: 1 } },
        select: detailSelect,
      });
      return { kind: 'corrected', registration: toDetail(updated) };
    });
  }

  /**
   * The organizer's correction of the gender answer (F64). Locks the
   * registration like a participant change, so the two cannot overlap; a
   * waiting change request must be decided first, it was proposed on the old
   * answer. An actual change bumps the version, so an open participant form
   * reloads instead of overwriting it.
   */
  async updateGender(
    scope: EventScope,
    registrationId: string,
    answer: GenderAnswer,
  ): Promise<'updated' | 'not_found' | 'change_pending'> {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.registration.findFirst({
        where: { id: registrationId, ...inScope(scope) },
        select: { id: true },
      });
      if (!found) return 'not_found';
      const [locked] = await tx.$queryRaw<GenderAnswer[]>`
        SELECT "gender"::text AS "gender", "genderOther" FROM "registration"
        WHERE "id" = ${registrationId}::uuid
        FOR UPDATE`;
      const pending = await tx.registrationChange.count({
        where: { registrationId, status: 'pending' },
      });
      if (pending > 0) return 'change_pending';
      if (
        locked.gender !== answer.gender ||
        locked.genderOther !== answer.genderOther
      ) {
        await tx.registration.update({
          where: { id: registrationId },
          data: { ...answer, version: { increment: 1 } },
        });
        if (locked.gender !== answer.gender) {
          await answerChanged(tx, registrationId);
        }
        // The answer is an input of every term of the registration.
        const terms = await tx.registrationTerm.findMany({
          where: { registrationId },
          select: { termId: true },
        });
        await termInputsChanged(
          tx,
          scope.eventId,
          terms.map((term) => term.termId),
        );
      }
      return 'updated';
    });
  }
}
