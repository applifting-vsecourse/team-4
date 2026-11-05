import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  changedFields,
  ChangeKind,
  ChangePlan,
  ChangeProposal,
  ChangeSubject,
  ChangeSummary,
  EventTermInfo,
  InvalidChangeError,
  planChange,
} from '@/modules/registrations/domain/registration-change';
import { Injectable } from '@nestjs/common';

type Db = Prisma.TransactionClient;

const termOrder = [
  { startDate: 'asc' },
  { id: 'asc' },
] satisfies Prisma.EventTermOrderByWithRelationInput[];

const termInfoSelect = {
  id: true,
  label: true,
  startDate: true,
  endDate: true,
  priceMinor: true,
} satisfies Prisma.EventTermSelect;

const toTermInfo = (
  term: Prisma.EventTermGetPayload<{ select: typeof termInfoSelect }>,
): EventTermInfo => ({
  id: term.id,
  label: term.label,
  startDate: fromDate(term.startDate),
  endDate: fromDate(term.endDate),
  priceMinor: term.priceMinor,
});

export type ChangeStatus = 'pending' | 'applied' | 'approved' | 'rejected';

/** A change as both sides read it. */
export type RegistrationChangeModel = {
  id: string;
  registrationId: string;
  status: ChangeStatus;
  kinds: ChangeKind[];
  createdAt: Date;
  decidedAt: Date | null;
  summary: ChangeSummary;
  /** Pending, and the registration changed after the proposal was made. */
  isStale: boolean;
  registration: { firstName: string; lastName: string; email: string };
};

export type ChangePreview = { version: number; plan: ChangePlan };

export type PreviewOutcome =
  | { kind: 'preview'; preview: ChangePreview }
  | { kind: 'not_found' }
  | { kind: 'change_pending' }
  | { kind: 'invalid'; error: InvalidChangeError };

export type SubmitOutcome =
  | { kind: 'applied'; change: RegistrationChangeModel }
  | { kind: 'requested'; change: RegistrationChangeModel }
  | { kind: 'not_found' }
  | { kind: 'stale' }
  | { kind: 'change_pending' }
  | { kind: 'invalid'; error: InvalidChangeError }
  /** The need for approval differs from what the participant confirmed. */
  | { kind: 'approval_changed'; plan: ChangePlan }
  /** A confirmed place would be given up without the participant's consent. */
  | { kind: 'release_consent_required'; plan: ChangePlan };

export type DecisionOutcome =
  | { kind: 'decided'; change: RegistrationChangeModel }
  /** Decided before, the same way: nothing is done twice. */
  | { kind: 'already_decided'; change: RegistrationChangeModel }
  | { kind: 'conflict'; change: RegistrationChangeModel }
  /** The registration changed after the proposal was made. */
  | { kind: 'stale' }
  | { kind: 'not_found' }
  | { kind: 'invalid'; error: InvalidChangeError }
  /** A request filed without consent to give up a confirmed place; it can only be rejected. */
  | { kind: 'release_consent_required'; plan: ChangePlan };

const snapshotSelect = {
  id: true,
  eventId: true,
  version: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  gender: true,
  genderOther: true,
  event: { select: { changeApprovalDays: true } },
  terms: {
    orderBy: [{ term: { startDate: 'asc' } }, { termId: 'asc' }],
    select: {
      termId: true,
      status: true,
      priceMinor: true,
      term: { select: { label: true, startDate: true, endDate: true } },
    },
  },
  payments: { select: { amountMinor: true } },
} satisfies Prisma.RegistrationSelect;

type Snapshot = Prisma.RegistrationGetPayload<{
  select: typeof snapshotSelect;
}>;

const changeSelect = {
  id: true,
  registrationId: true,
  status: true,
  proposal: true,
  summary: true,
  createdAt: true,
  decidedAt: true,
  registration: {
    select: { firstName: true, lastName: true, email: true, version: true },
  },
} satisfies Prisma.RegistrationChangeSelect;

type ChangeRow = Prisma.RegistrationChangeGetPayload<{
  select: typeof changeSelect;
}>;

/** The proposal as stored: with the registration version it was made on. */
type StoredProposal = ChangeProposal & { baseVersion: number };

type StoredSummary = ChangeSummary & { kinds: ChangeKind[] };

const subjectOf = (row: Snapshot): ChangeSubject => ({
  firstName: row.firstName,
  lastName: row.lastName,
  phone: row.phone,
  gender: row.gender,
  genderOther: row.genderOther,
  paidMinor: row.payments.reduce((sum, p) => sum + p.amountMinor, 0),
  terms: row.terms.map((term) => ({
    termId: term.termId,
    label: term.term.label,
    startDate: fromDate(term.term.startDate),
    endDate: fromDate(term.term.endDate),
    priceMinor: term.priceMinor,
    status: term.status,
  })),
});

const toModel = (
  row: ChangeRow,
  live: ChangePlan | null = null,
): RegistrationChangeModel => {
  const stored = row.summary as unknown as StoredSummary;
  const proposal = row.proposal as unknown as StoredProposal;
  const summary = live?.summary ?? stored;
  return {
    id: row.id,
    registrationId: row.registrationId,
    status: row.status,
    kinds: live?.kinds ?? stored.kinds,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
    summary: {
      values: summary.values,
      terms: summary.terms,
      original: summary.original,
      proposed: summary.proposed,
    },
    isStale:
      row.status === 'pending' &&
      proposal.baseVersion !== row.registration.version,
    registration: {
      firstName: row.registration.firstName,
      lastName: row.registration.lastName,
      email: row.registration.email,
    },
  };
};

const storedSummary = (plan: ChangePlan): Prisma.InputJsonValue =>
  JSON.parse(
    JSON.stringify({ kinds: plan.kinds, ...plan.summary }),
  ) as Prisma.InputJsonValue;

@Injectable()
export class RegistrationChangesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Reads ────────────────────────────────────────────────────────────────

  /** The participant's own changes of one registration, newest first. */
  async findOwn(
    accountId: string,
    registrationId: string,
  ): Promise<RegistrationChangeModel[] | null> {
    return this.findFor({
      id: registrationId,
      participantAccountId: accountId,
    });
  }

  /** Changes of a registration of the scope's event, newest first. */
  async findManaged(
    scope: EventScope,
    registrationId: string,
  ): Promise<RegistrationChangeModel[] | null> {
    return this.findFor({ id: registrationId, ...inScope(scope) });
  }

  /** Requests waiting for the organizer, oldest first. */
  async findPending(
    scope: EventScope,
  ): Promise<RegistrationChangeModel[] | null> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: scope.eventId,
        organizationId: scope.organizationId,
        organization: { ownerId: scope.ownerId },
      },
      select: { id: true },
    });
    if (!event) return null;
    const rows = await this.prisma.registrationChange.findMany({
      where: { eventId: scope.eventId, status: 'pending' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: changeSelect,
    });
    return Promise.all(rows.map((row) => this.withLivePlan(this.prisma, row)));
  }

  private async findFor(
    where: Prisma.RegistrationWhereInput,
  ): Promise<RegistrationChangeModel[] | null> {
    const registration = await this.prisma.registration.findFirst({
      where,
      select: { id: true },
    });
    if (!registration) return null;
    const rows = await this.prisma.registrationChange.findMany({
      where: { registrationId: registration.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: changeSelect,
    });
    return Promise.all(rows.map((row) => this.withLivePlan(this.prisma, row)));
  }

  /** A waiting request is worked out against today's prices. */
  private async withLivePlan(
    db: Db,
    row: ChangeRow,
  ): Promise<RegistrationChangeModel> {
    if (row.status !== 'pending') return toModel(row);
    const snapshot = await db.registration.findUniqueOrThrow({
      where: { id: row.registrationId },
      select: snapshotSelect,
    });
    try {
      const plan = await this.plan(
        db,
        snapshot,
        row.proposal as unknown as ChangeProposal,
        new Date(),
      );
      return toModel(row, plan);
    } catch (error) {
      if (error instanceof InvalidChangeError) return toModel(row);
      throw error;
    }
  }

  /** The event's terms the registration could move to, by start. */
  async availableTerms(registrationId: string): Promise<EventTermInfo[]> {
    const registration = await this.prisma.registration.findUniqueOrThrow({
      where: { id: registrationId },
      select: { eventId: true },
    });
    const terms = await this.prisma.eventTerm.findMany({
      where: { eventId: registration.eventId },
      orderBy: termOrder,
      select: termInfoSelect,
    });
    return terms.map(toTermInfo);
  }

  // ─── Participant: preview, submit ─────────────────────────────────────────

  async preview(
    accountId: string,
    registrationId: string,
    proposal: ChangeProposal,
  ): Promise<PreviewOutcome> {
    const snapshot = await this.prisma.registration.findFirst({
      where: { id: registrationId, participantAccountId: accountId },
      select: snapshotSelect,
    });
    if (!snapshot) return { kind: 'not_found' };
    if (await this.hasPending(this.prisma, registrationId)) {
      return { kind: 'change_pending' };
    }
    try {
      const plan = await this.plan(this.prisma, snapshot, proposal, new Date());
      return { kind: 'preview', preview: { version: snapshot.version, plan } };
    } catch (error) {
      return invalid(error);
    }
  }

  /**
   * Executes the change or files it as a request. The registration is locked,
   * then the terms it touches in id order (the serialization point shared with
   * registering and room changes); a failure leaves nothing half done.
   */
  async submit(
    accountId: string,
    registrationId: string,
    input: {
      proposal: ChangeProposal;
      expectedVersion: number;
      expectsApproval: boolean;
    },
    now: Date,
  ): Promise<SubmitOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "registration"
        WHERE "id" = ${registrationId}::uuid
          AND "participantAccountId" = ${accountId}::uuid
        FOR UPDATE`;
      if (locked.length === 0) return { kind: 'not_found' };
      const snapshot = await tx.registration.findUniqueOrThrow({
        where: { id: registrationId },
        select: snapshotSelect,
      });
      if (snapshot.version !== input.expectedVersion) return { kind: 'stale' };
      if (await this.hasPending(tx, registrationId)) {
        return { kind: 'change_pending' };
      }

      let plan: ChangePlan;
      try {
        await this.lockTerms(tx, snapshot, input.proposal);
        plan = await this.plan(tx, snapshot, input.proposal, now);
      } catch (error) {
        return invalid(error);
      }
      if (plan.moves.some((move) => needsConsent(move))) {
        return { kind: 'release_consent_required', plan };
      }
      if (plan.requiresApproval !== input.expectsApproval) {
        return { kind: 'approval_changed', plan };
      }

      if (plan.requiresApproval) {
        const row = await tx.registrationChange.create({
          data: {
            registrationId,
            eventId: snapshot.eventId,
            status: 'pending',
            proposal: {
              ...input.proposal,
              baseVersion: snapshot.version,
            } as unknown as Prisma.InputJsonValue,
            summary: storedSummary(plan),
          },
          select: changeSelect,
        });
        return { kind: 'requested', change: toModel(row, plan) };
      }
      await this.apply(tx, snapshot, plan, now);
      const row = await tx.registrationChange.create({
        data: {
          registrationId,
          eventId: snapshot.eventId,
          status: 'applied',
          decidedAt: now,
          proposal: {
            ...input.proposal,
            baseVersion: snapshot.version,
          } as unknown as Prisma.InputJsonValue,
          summary: storedSummary(plan),
        },
        select: changeSelect,
      });
      return { kind: 'applied', change: toModel(row) };
    });
  }

  // ─── Organizer: decide ────────────────────────────────────────────────────

  async approve(
    scope: EventScope,
    registrationId: string,
    changeId: string,
    now: Date,
  ): Promise<DecisionOutcome> {
    return this.decide(
      scope,
      registrationId,
      changeId,
      async (tx, row) => {
        const snapshot = await tx.registration.findUniqueOrThrow({
          where: { id: registrationId },
          select: snapshotSelect,
        });
        const proposal = row.proposal as unknown as StoredProposal;
        // Never overwrite data that changed after the participant confirmed.
        if (proposal.baseVersion !== snapshot.version) return { kind: 'stale' };
        let plan: ChangePlan;
        try {
          await this.lockTerms(tx, snapshot, proposal);
          plan = await this.plan(tx, snapshot, proposal, now);
        } catch (error) {
          return invalid(error);
        }
        // A request filed before S3-01 never asked to give up a confirmed place.
        if (plan.moves.some((move) => needsConsent(move))) {
          return { kind: 'release_consent_required', plan };
        }
        await this.apply(tx, snapshot, plan, now);
        const updated = await tx.registrationChange.update({
          where: { id: changeId },
          data: {
            status: 'approved',
            decidedAt: now,
            summary: storedSummary(plan),
          },
          select: changeSelect,
        });
        return { kind: 'decided', change: toModel(updated) };
      },
      'approved',
    );
  }

  async reject(
    scope: EventScope,
    registrationId: string,
    changeId: string,
    now: Date,
  ): Promise<DecisionOutcome> {
    return this.decide(
      scope,
      registrationId,
      changeId,
      async (tx) => {
        const updated = await tx.registrationChange.update({
          where: { id: changeId },
          data: { status: 'rejected', decidedAt: now },
          select: changeSelect,
        });
        return { kind: 'decided', change: toModel(updated) };
      },
      'rejected',
    );
  }

  private async decide(
    scope: EventScope,
    registrationId: string,
    changeId: string,
    run: (tx: Db, row: ChangeRow) => Promise<DecisionOutcome>,
    wanted: 'approved' | 'rejected',
  ): Promise<DecisionOutcome> {
    const owned = await this.prisma.registrationChange.findFirst({
      where: { id: changeId, registrationId, registration: inScope(scope) },
      select: { id: true },
    });
    if (!owned) return { kind: 'not_found' };
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "registration"
        WHERE "id" = ${registrationId}::uuid FOR UPDATE`;
      const row = await tx.registrationChange.findUniqueOrThrow({
        where: { id: changeId },
        select: changeSelect,
      });
      if (row.status !== 'pending') {
        const change = toModel(row);
        return row.status === wanted
          ? { kind: 'already_decided', change }
          : { kind: 'conflict', change };
      }
      return run(tx, row);
    });
  }

  // ─── Shared ───────────────────────────────────────────────────────────────

  private async hasPending(db: Db, registrationId: string): Promise<boolean> {
    const pending = await db.registrationChange.count({
      where: { registrationId, status: 'pending' },
    });
    return pending > 0;
  }

  /** Terms the change reads or writes, in id order. */
  private async lockTerms(
    tx: Db,
    snapshot: Snapshot,
    proposal: ChangeProposal,
  ): Promise<void> {
    const ids = [
      ...new Set([
        ...snapshot.terms.map((term) => term.termId),
        ...proposal.moves.map((move) => move.toTermId),
      ]),
    ];
    await tx.$queryRaw`
      SELECT "id" FROM "event_term"
      WHERE "eventId" = ${snapshot.eventId}::uuid
        AND "id" = ANY(${ids}::uuid[])
      ORDER BY "id" FOR UPDATE`;
  }

  private async plan(
    db: Db,
    snapshot: Snapshot,
    proposal: ChangeProposal,
    now: Date,
  ): Promise<ChangePlan> {
    const targets = await db.eventTerm.findMany({
      where: {
        eventId: snapshot.eventId,
        id: { in: proposal.moves.map((move) => move.toTermId) },
      },
      select: termInfoSelect,
    });
    const eventTerms = new Map<string, EventTermInfo>(
      targets.map((term) => [term.id, toTermInfo(term)]),
    );
    return planChange(
      subjectOf(snapshot),
      proposal,
      eventTerms,
      snapshot.event.changeApprovalDays,
      now,
    );
  }

  private async apply(
    tx: Db,
    snapshot: Snapshot,
    plan: ChangePlan,
    now: Date,
  ): Promise<void> {
    for (const row of plan.summary.terms) {
      if (row.original === row.proposed || row.proposed === null) continue;
      if (row.proposed === 'cancelled') {
        await tx.registrationTerm.update({
          where: {
            registrationId_termId: {
              registrationId: snapshot.id,
              termId: row.termId,
            },
          },
          data: { status: 'cancelled', decidedAt: now },
        });
      } else {
        const data = {
          status: row.proposed,
          priceMinor: row.priceMinor,
          decidedAt: now,
        };
        await tx.registrationTerm.upsert({
          where: {
            registrationId_termId: {
              registrationId: snapshot.id,
              termId: row.termId,
            },
          },
          create: {
            registrationId: snapshot.id,
            eventId: snapshot.eventId,
            termId: row.termId,
            ...data,
          },
          update: data,
        });
      }
    }
    // A change never confirms a term (S3-01), so nothing new becomes due.
    await tx.registration.update({
      where: { id: snapshot.id },
      data: { ...changedFields(plan.summary), version: { increment: 1 } },
    });
  }
}

const needsConsent = (move: {
  requiresReleaseConsent: boolean;
  acceptRelease: boolean;
}): boolean => move.requiresReleaseConsent && !move.acceptRelease;

const invalid = (
  error: unknown,
): { kind: 'invalid'; error: InvalidChangeError } => {
  if (error instanceof InvalidChangeError) return { kind: 'invalid', error };
  throw error;
};

const inScope = (scope: EventScope): Prisma.RegistrationWhereInput => ({
  eventId: scope.eventId,
  organizationId: scope.organizationId,
  event: { organization: { ownerId: scope.ownerId } },
});
