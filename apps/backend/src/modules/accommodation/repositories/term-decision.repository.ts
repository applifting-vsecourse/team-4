import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  DecisionRefusal,
  DecisionTerm,
  resultPayload,
} from '@/modules/accommodation/domain/term-decision';
import {
  DeterminationOutcome,
  RegistrationAccommodationRepository,
} from '@/modules/accommodation/repositories/registration-accommodation.repository';
import { termInputsChanged } from '@/modules/accommodation/repositories/term-inputs';
import { SolverResult } from '@/modules/accommodation/solver/solver.types';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { paymentReminderAt } from '@/modules/registrations/domain/registration';
import { Injectable } from '@nestjs/common';

type Db = Prisma.TransactionClient;

type Person = { registrationId: string; firstName: string; lastName: string };

export type BulkOutcome =
  | {
      kind: 'confirmed';
      /** True when this repeats a request that was already saved. */
      replay: boolean;
      people: Person[];
    }
  | { kind: 'not_found' }
  | { kind: 'refused'; refusal: DecisionRefusal }
  /** The submission key belongs to another decision. */
  | { kind: 'key_reused' };

export type DecideOutcome =
  | { kind: 'decided'; replay: boolean; status: DecisionTerm }
  | { kind: 'not_found' }
  | { kind: 'refused'; refusal: DecisionRefusal }
  | { kind: 'determination_failed'; outcome: DeterminationOutcome }
  /** The term's inputs moved since the check; the caller checks again. */
  | { kind: 'changed' }
  | { kind: 'key_reused' };

type Move = {
  registrationId: string;
  from: 'pending' | 'waitlisted';
  to: 'confirmed' | 'waitlisted';
};

/** One saved change in the immutable decision record, for the history. */
export type DecisionRecord = {
  id: string;
  createdAt: Date;
  actor: { id: string; name: string };
  kind: 'bulk' | 'individual';
  termId: string;
  termLabel: string;
  from: DecisionTerm;
  to: DecisionTerm;
  /** The proposal a bulk confirmation used; null for an individual decision. */
  run: { id: string; finishedAt: Date } | null;
  /** People confirmed together with this one; 1 for an individual decision. */
  batchSize: number;
};

type SavedBatch = {
  kind: 'bulk' | 'individual';
  eventId: string;
  termId: string;
  runId: string | null;
  registrationId: string;
  toStatus: DecisionTerm;
  registrationIds: string[];
};

const ownedEvent = (scope: EventScope): Prisma.EventWhereInput => ({
  id: scope.eventId,
  organizationId: scope.organizationId,
  organization: { ownerId: scope.ownerId },
});

@Injectable()
export class TermDecisionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly determinations: RegistrationAccommodationRepository,
  ) {}

  /** Whether a decision request with this key was already saved. */
  async isSaved(submissionKey: string): Promise<boolean> {
    return (
      (await this.prisma.accommodationDecision.count({
        where: { submissionKey },
      })) > 0
    );
  }

  /** The term's input version now; 0 before its first change. */
  async inputVersion(termId: string): Promise<number> {
    const state = await this.prisma.accommodationTermState.findUnique({
      where: { termId },
      select: { inputVersion: true },
    });
    return state?.inputVersion ?? 0;
  }

  /**
   * "Potvrdit všechny vhodné": confirms every suitable person of the run's
   * proposal, or nobody. The people, the term and the state are locked, the
   * proposal must still be the term's current one, and the confirmations,
   * the decision record, the payment obligations and the result events are
   * written in one transaction. The same key again changes nothing.
   */
  async confirmProposal(
    scope: EventScope,
    termId: string,
    input: { runId: string; submissionKey: string; actorId: string },
  ): Promise<BulkOutcome> {
    const run = await this.prisma.accommodationRun.findFirst({
      where: {
        id: input.runId,
        termId,
        eventId: scope.eventId,
        event: ownedEvent(scope),
      },
      select: { status: true, result: true, inputVersion: true },
    });
    if (!run) return { kind: 'not_found' };
    const suitable =
      run.status === 'solved'
        ? [
            ...(run.result as Extract<SolverResult, { status: 'solved' }>)
              .suitable,
          ]
        : [];
    const ids = [...new Set(suitable)].sort();

    return this.prisma.$transaction(
      async (tx): Promise<BulkOutcome> => {
        await this.lockRegistrations(tx, ids);
        const version = await this.lockTerm(tx, scope.eventId, termId);

        const saved = await this.savedBatch(tx, input.submissionKey);
        if (saved) {
          const same =
            saved.kind === 'bulk' &&
            saved.termId === termId &&
            saved.eventId === scope.eventId &&
            saved.runId === input.runId;
          if (!same) return { kind: 'key_reused' };
          return {
            kind: 'confirmed',
            replay: true,
            people: await this.people(tx, saved.registrationIds),
          };
        }

        if (run.status !== 'solved') {
          return { kind: 'refused', refusal: 'proposal_unavailable' };
        }
        if (run.inputVersion !== version) {
          return { kind: 'refused', refusal: 'proposal_stale' };
        }
        if (ids.length === 0) {
          return { kind: 'refused', refusal: 'nothing_to_confirm' };
        }
        const undecided = await tx.registrationTerm.findMany({
          where: {
            termId,
            registrationId: { in: ids },
            status: { in: ['pending', 'waitlisted'] },
          },
          select: { registrationId: true, status: true },
        });
        if (undecided.length !== ids.length) {
          return { kind: 'refused', refusal: 'proposal_stale' };
        }

        await this.apply(tx, {
          eventId: scope.eventId,
          termId,
          kind: 'bulk',
          runId: input.runId,
          submissionKey: input.submissionKey,
          actorId: input.actorId,
          moves: undecided.map(({ registrationId, status }) => ({
            registrationId,
            from: status as Move['from'],
            to: 'confirmed',
          })),
        });
        return {
          kind: 'confirmed',
          replay: false,
          people: await this.people(tx, ids),
        };
      },
      { timeout: 30_000 },
    );
  }

  /**
   * One person's decision in one term. `expectedVersion` is the input
   * version the caller's capacity check read; when the term moved since,
   * nothing is written and the caller checks again. A determination is
   * written in the same transaction, so it exists only with the decision.
   */
  async decide(
    scope: EventScope,
    termId: string,
    registrationId: string,
    input: {
      decision: 'confirm' | 'waitlist';
      determination?: { value: string; reason: string; answer: string | null };
      expectedVersion: number;
      submissionKey: string;
      actorId: string;
    },
  ): Promise<DecideOutcome> {
    const owned = await this.prisma.registrationTerm.findFirst({
      where: {
        termId,
        registrationId,
        eventId: scope.eventId,
        registration: {
          organizationId: scope.organizationId,
          event: { organization: { ownerId: scope.ownerId } },
        },
      },
      select: { termId: true },
    });
    if (!owned) return { kind: 'not_found' };

    return this.prisma.$transaction(
      async (tx): Promise<DecideOutcome> => {
        await this.lockRegistrations(tx, [registrationId]);
        const version = await this.lockTerm(tx, scope.eventId, termId);

        const saved = await this.savedBatch(tx, input.submissionKey);
        if (saved) {
          const same =
            saved.kind === 'individual' &&
            saved.termId === termId &&
            saved.eventId === scope.eventId &&
            saved.registrationIds[0] === registrationId &&
            (saved.toStatus === 'confirmed') === (input.decision === 'confirm');
          if (!same) return { kind: 'key_reused' };
          return { kind: 'decided', replay: true, status: saved.toStatus };
        }

        if (version !== input.expectedVersion) return { kind: 'changed' };
        const row = await tx.registrationTerm.findUnique({
          where: { registrationId_termId: { registrationId, termId } },
          select: { status: true },
        });
        if (!row || row.status === 'cancelled') return { kind: 'not_found' };
        if (row.status === 'confirmed') {
          return { kind: 'refused', refusal: 'not_undecided' };
        }
        if (input.decision === 'waitlist' && row.status === 'waitlisted') {
          return { kind: 'refused', refusal: 'already_waitlisted' };
        }

        if (input.determination) {
          const outcome = await this.determinations.determineWithin(
            tx,
            registrationId,
            { ...input.determination, actorId: input.actorId },
          );
          if (outcome.kind !== 'determined') {
            return { kind: 'determination_failed', outcome };
          }
        }

        const to = input.decision === 'confirm' ? 'confirmed' : 'waitlisted';
        await this.apply(tx, {
          eventId: scope.eventId,
          termId,
          kind: 'individual',
          runId: null,
          submissionKey: input.submissionKey,
          actorId: input.actorId,
          moves: [{ registrationId, from: row.status, to }],
        });
        return { kind: 'decided', replay: false, status: to };
      },
      { timeout: 30_000 },
    );
  }

  /** Newest first; null for a registration of another event or owner. */
  async history(
    scope: EventScope,
    registrationId: string,
  ): Promise<DecisionRecord[] | null> {
    const registration = await this.prisma.registration.findFirst({
      where: {
        id: registrationId,
        eventId: scope.eventId,
        organizationId: scope.organizationId,
        event: { organization: { ownerId: scope.ownerId } },
      },
      select: { id: true },
    });
    if (!registration) return null;
    const rows = await this.prisma.accommodationDecision.findMany({
      where: { registrationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        createdAt: true,
        kind: true,
        batchId: true,
        runId: true,
        fromStatus: true,
        toStatus: true,
        termId: true,
        term: { select: { label: true } },
        actor: { select: { id: true, name: true } },
      },
    });
    const runIds = [...new Set(rows.flatMap((row) => row.runId ?? []))];
    const batchIds = [...new Set(rows.map((row) => row.batchId))];
    const [runs, sizes] = await Promise.all([
      this.prisma.accommodationRun.findMany({
        where: { id: { in: runIds } },
        select: { id: true, finishedAt: true },
      }),
      this.prisma.accommodationDecision.groupBy({
        by: ['batchId'],
        where: { batchId: { in: batchIds } },
        _count: { _all: true },
      }),
    ]);
    const finished = new Map(runs.map((run) => [run.id, run.finishedAt]));
    const size = new Map(sizes.map((s) => [s.batchId, s._count._all]));
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      actor: row.actor,
      kind: row.kind,
      termId: row.termId,
      termLabel: row.term.label,
      from: row.fromStatus,
      to: row.toStatus,
      run:
        row.runId && finished.has(row.runId)
          ? { id: row.runId, finishedAt: finished.get(row.runId) as Date }
          : null,
      batchSize: size.get(row.batchId) ?? 1,
    }));
  }

  /** Registration rows in id order: the one lock order of every writer. */
  private async lockRegistrations(
    tx: Db,
    ids: readonly string[],
  ): Promise<void> {
    if (ids.length === 0) return;
    await tx.$queryRaw`
      SELECT "id" FROM "registration"
      WHERE "id" = ANY(${ids as string[]}::uuid[])
      ORDER BY "id" FOR UPDATE`;
  }

  /**
   * Locks the term and its state row, so no change of the term's inputs
   * (nor another decision) is saved until this transaction ends, and returns
   * the input version. The term is taken `NO KEY UPDATE`, which lets the
   * `KEY SHARE` of other writers through, as `termInputsChanged` expects.
   */
  private async lockTerm(
    tx: Db,
    eventId: string,
    termId: string,
  ): Promise<number> {
    await tx.$queryRaw`
      SELECT "id" FROM "event_term"
      WHERE "id" = ${termId}::uuid FOR NO KEY UPDATE`;
    await tx.$executeRaw`
      INSERT INTO "accommodation_term_state" ("termId", "eventId", "inputVersion")
      VALUES (${termId}::uuid, ${eventId}::uuid, 0)
      ON CONFLICT ("termId") DO NOTHING`;
    const [state] = await tx.$queryRaw<{ inputVersion: number }[]>`
      SELECT "inputVersion" FROM "accommodation_term_state"
      WHERE "termId" = ${termId}::uuid FOR UPDATE`;
    return state.inputVersion;
  }

  /** The decision a submission key already saved; null when none. */
  private async savedBatch(
    tx: Db,
    submissionKey: string,
  ): Promise<SavedBatch | null> {
    const rows = await tx.accommodationDecision.findMany({
      where: { submissionKey },
      orderBy: { registrationId: 'asc' },
      select: {
        kind: true,
        eventId: true,
        termId: true,
        runId: true,
        registrationId: true,
        toStatus: true,
      },
    });
    if (rows.length === 0) return null;
    return {
      ...rows[0],
      registrationIds: rows.map((row) => row.registrationId),
    };
  }

  private async people(tx: Db, ids: readonly string[]): Promise<Person[]> {
    const rows = await tx.registration.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { receivedAt: 'asc' },
    });
    return rows.map(({ id, ...name }) => ({ registrationId: id, ...name }));
  }

  /**
   * Moves the people, records each move, sets the reminder of a registration
   * that is confirmed for the first time, bumps the term's inputs (the old
   * proposal turns stale) and prepares one result event per registration.
   */
  private async apply(
    tx: Db,
    batch: {
      eventId: string;
      termId: string;
      kind: 'bulk' | 'individual';
      runId: string | null;
      submissionKey: string;
      actorId: string;
      moves: Move[];
    },
  ): Promise<void> {
    const now = new Date();
    const batchId = crypto.randomUUID();
    for (const move of batch.moves) {
      const { count } = await tx.registrationTerm.updateMany({
        where: {
          registrationId: move.registrationId,
          termId: batch.termId,
          status: move.from,
        },
        data: { status: move.to, decidedAt: now },
      });
      // The registration is locked, so a miss would be a broken invariant.
      if (count !== 1) throw new Error('Participation changed under lock');
    }
    await tx.accommodationDecision.createMany({
      data: batch.moves.map((move) => ({
        eventId: batch.eventId,
        termId: batch.termId,
        registrationId: move.registrationId,
        batchId,
        submissionKey: batch.submissionKey,
        kind: batch.kind,
        runId: batch.runId,
        actorId: batch.actorId,
        fromStatus: move.from,
        toStatus: move.to,
        createdAt: now,
      })),
    });

    for (const move of batch.moves) {
      const registration = await tx.registration.findUniqueOrThrow({
        where: { id: move.registrationId },
        select: { paymentReminderAt: true, paymentReminderDays: true },
      });
      // The first confirmation starts the reminder clock; a date already set
      // (an earlier confirmation) is never moved.
      let reminderAt = registration.paymentReminderAt;
      if (
        move.to === 'confirmed' &&
        reminderAt === null &&
        registration.paymentReminderDays !== null
      ) {
        reminderAt = paymentReminderAt(now, registration.paymentReminderDays);
        await tx.registration.update({
          where: { id: move.registrationId },
          data: { paymentReminderAt: reminderAt },
        });
      }
    }
    await termInputsChanged(tx, batch.eventId, [batch.termId]);

    for (const move of batch.moves) {
      const registration = await tx.registration.findUniqueOrThrow({
        where: { id: move.registrationId },
        select: {
          variableSymbol: true,
          paymentReminderAt: true,
          terms: {
            where: { status: { not: 'cancelled' } },
            orderBy: { term: { startDate: 'asc' } },
            select: {
              termId: true,
              status: true,
              priceMinor: true,
              term: {
                select: { label: true, startDate: true, endDate: true },
              },
            },
          },
          payments: { select: { amountMinor: true } },
        },
      });
      await tx.registrationResultEvent.create({
        data: {
          eventId: batch.eventId,
          registrationId: move.registrationId,
          batchId,
          payload: resultPayload({
            decided: batch.moves
              .filter((m) => m.registrationId === move.registrationId)
              .map((m) => ({ termId: batch.termId, from: m.from, to: m.to })),
            terms: registration.terms.map((term) => ({
              termId: term.termId,
              label: term.term.label,
              startDate: fromDate(term.term.startDate),
              endDate: fromDate(term.term.endDate),
              status: term.status,
              priceMinor: term.priceMinor,
            })),
            paidMinor: registration.payments.reduce(
              (sum, payment) => sum + payment.amountMinor,
              0,
            ),
            variableSymbol: registration.variableSymbol,
            reminderAt: registration.paymentReminderAt,
          }) as unknown as Prisma.InputJsonValue,
          createdAt: now,
        },
      });
    }
  }
}
