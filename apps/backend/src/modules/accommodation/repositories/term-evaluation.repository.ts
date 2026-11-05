import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  AccommodationRules,
  NO_RULES,
  TermRoom,
} from '@/modules/accommodation/domain/evaluation-input';
import {
  RunOutcome,
  TermPerson,
} from '@/modules/accommodation/domain/term-evaluation';
import {
  AccommodationRunModel,
  runSelect,
  toRun,
} from '@/modules/accommodation/repositories/accommodation-evaluation.repository';
import { SolverResult } from '@/modules/accommodation/solver/solver.types';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

export type EvaluationMode = 'automatic' | 'manual';

export type TermSummary = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

/** Everything the term view is built from, before the answers are added. */
export type TermEvaluationData = {
  mode: EvaluationMode;
  term: TermSummary;
  rules: AccommodationRules;
  /** The event has any room at all (S2-05); without one no capacity is recorded. */
  hasRooms: boolean;
  rooms: TermRoom[];
  people: Omit<TermPerson, 'answer'>[];
  storedOrder: string[] | null;
  inputVersion: number;
  isRunning: boolean;
  /** When the next evaluation is due; null when none is scheduled. */
  scheduledAt: Date | null;
  /** The organizer asked for the scheduled evaluation ("Přepočítat"). */
  isRequested: boolean;
  latest: RunOutcome | null;
  lastSolved: RunOutcome | null;
  lastInfeasible: RunOutcome | null;
};

/** A run as the history lists it. */
export type RunListItem = RunOutcome & {
  startedAt: Date;
  triggeredBy: { id: string; name: string } | null;
};

/** A stored run with who started it and the names of the people it evaluated. */
export type RunEvidence = AccommodationRunModel & {
  termLabel: string;
  triggeredBy: { id: string; name: string } | null;
  names: Map<string, { firstName: string; lastName: string }>;
  /** The term's input version now; the run is current while equal. */
  currentInputVersion: number;
};

const outcomeSelect = {
  id: true,
  status: true,
  inputVersion: true,
  finishedAt: true,
  result: true,
} satisfies Prisma.AccommodationRunSelect;

const toOutcome = (
  row: Prisma.AccommodationRunGetPayload<{
    select: typeof outcomeSelect;
  }> | null,
): RunOutcome | null =>
  row && { ...row, result: row.result as SolverResult | null };

const newestFirst = [
  { startedAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.AccommodationRunOrderByWithRelationInput[];

/** Only an event of an organization the caller owns (§3.2). */
const ownedEvent = (scope: EventScope): Prisma.EventWhereInput => ({
  id: scope.eventId,
  organizationId: scope.organizationId,
  organization: { ownerId: scope.ownerId },
});

@Injectable()
export class TermEvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when the event is not in an organization of the caller. */
  async findMode(scope: EventScope): Promise<EvaluationMode | null> {
    const event = await this.prisma.event.findFirst({
      where: ownedEvent(scope),
      select: { accommodationEvaluationMode: true },
    });
    return event?.accommodationEvaluationMode ?? null;
  }

  /**
   * False when the event is not in an organization of the caller. The manual
   * mode drops evaluations the automatic one scheduled; a "Přepočítat" stays.
   */
  async saveMode(scope: EventScope, mode: EvaluationMode): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.event.updateMany({
        where: ownedEvent(scope),
        data: { accommodationEvaluationMode: mode },
      });
      if (count !== 1) return false;
      if (mode === 'manual') {
        await tx.accommodationTermState.updateMany({
          where: { eventId: scope.eventId, requestedById: null },
          data: { dueAt: null },
        });
      }
      return true;
    });
  }

  /** Whether the term belongs to an event of an organization the caller owns. */
  async isTermInScope(scope: EventScope, termId: string): Promise<boolean> {
    const term = await this.prisma.eventTerm.findFirst({
      where: { id: termId, eventId: scope.eventId, event: ownedEvent(scope) },
      select: { id: true },
    });
    return term !== null;
  }

  /** Null for a term of a foreign or missing event. */
  async findTerm(
    scope: EventScope,
    termId: string,
  ): Promise<TermEvaluationData | null> {
    const term = await this.prisma.eventTerm.findFirst({
      where: { id: termId, eventId: scope.eventId, event: ownedEvent(scope) },
      select: {
        id: true,
        label: true,
        startDate: true,
        endDate: true,
        accommodationOrder: { select: { registrationIds: true } },
        accommodationState: {
          select: {
            inputVersion: true,
            runningRunId: true,
            dueAt: true,
            requestedById: true,
          },
        },
        event: {
          select: {
            accommodationEvaluationMode: true,
            accommodationRules: {
              select: { hardAttribute: true, nonDeterminingValues: true },
            },
            _count: { select: { rooms: true } },
          },
        },
        roomAvailabilities: {
          where: { isAvailable: true },
          orderBy: [{ room: { label: 'asc' } }, { roomId: 'asc' }],
          select: {
            roomId: true,
            baseBeds: true,
            extraBeds: true,
            room: { select: { label: true } },
          },
        },
        registrationTerms: {
          where: { status: { not: 'cancelled' } },
          select: {
            status: true,
            registration: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                receivedAt: true,
                accommodationManualValue: {
                  select: { value: true, basedOnAnswer: true },
                },
              },
            },
          },
        },
      },
    });
    if (!term) return null;
    const [latest, lastSolved, lastInfeasible] = await Promise.all(
      [undefined, 'solved', 'infeasible'].map((status) =>
        this.prisma.accommodationRun.findFirst({
          where: {
            termId,
            ...(status ? { status: status as 'solved' | 'infeasible' } : {}),
          },
          orderBy: newestFirst,
          select: outcomeSelect,
        }),
      ),
    );
    const rules = term.event.accommodationRules;
    return {
      mode: term.event.accommodationEvaluationMode,
      term: {
        id: term.id,
        label: term.label,
        startDate: fromDate(term.startDate),
        endDate: fromDate(term.endDate),
      },
      rules: rules?.hardAttribute
        ? {
            hardAttribute: {
              attribute: rules.hardAttribute,
              nonDeterminingValues: rules.nonDeterminingValues,
            },
            softAttributes: [],
          }
        : NO_RULES,
      hasRooms: term.event._count.rooms > 0,
      rooms: term.roomAvailabilities.map((availability) => ({
        roomId: availability.roomId,
        label: availability.room.label,
        baseBeds: availability.baseBeds,
        extraBeds: availability.extraBeds,
      })),
      people: term.registrationTerms.map(({ status, registration }) => ({
        registrationId: registration.id,
        firstName: registration.firstName,
        lastName: registration.lastName,
        receivedAt: registration.receivedAt,
        status: status as TermPerson['status'],
        manualValue: registration.accommodationManualValue,
      })),
      storedOrder: term.accommodationOrder?.registrationIds ?? null,
      inputVersion: term.accommodationState?.inputVersion ?? 0,
      isRunning: Boolean(term.accommodationState?.runningRunId),
      scheduledAt: term.accommodationState?.dueAt ?? null,
      isRequested: Boolean(term.accommodationState?.requestedById),
      latest: toOutcome(latest),
      lastSolved: toOutcome(lastSolved),
      lastInfeasible: toOutcome(lastInfeasible),
    };
  }

  /** The runs of a term, newest first; null for a term out of scope. */
  async findRuns(
    scope: EventScope,
    termId: string,
  ): Promise<{ inputVersion: number; runs: RunListItem[] } | null> {
    if (!(await this.isTermInScope(scope, termId))) return null;
    const [state, rows] = await Promise.all([
      this.prisma.accommodationTermState.findUnique({
        where: { termId },
        select: { inputVersion: true },
      }),
      this.prisma.accommodationRun.findMany({
        where: { termId },
        orderBy: newestFirst,
        select: {
          ...outcomeSelect,
          startedAt: true,
          triggeredBy: { select: { id: true, name: true } },
        },
      }),
    ]);
    return {
      inputVersion: state?.inputVersion ?? 0,
      runs: rows.map((row) => ({
        ...row,
        result: row.result as SolverResult | null,
      })),
    };
  }

  /** One run of the scope's event; null for a run of another event or owner. */
  async findRun(scope: EventScope, runId: string): Promise<RunEvidence | null> {
    const row = await this.prisma.accommodationRun.findFirst({
      where: { id: runId, eventId: scope.eventId, event: ownedEvent(scope) },
      select: {
        ...runSelect,
        term: {
          select: {
            label: true,
            accommodationState: { select: { inputVersion: true } },
          },
        },
        triggeredBy: { select: { id: true, name: true } },
      },
    });
    if (!row) return null;
    const run = toRun(row);
    const ids = [
      ...run.input.confirmed.map((person) => person.registrationId),
      ...run.input.order.map((person) => person.registrationId),
    ];
    const registrations = await this.prisma.registration.findMany({
      where: { eventId: scope.eventId, id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    return {
      ...run,
      termLabel: row.term.label,
      triggeredBy: row.triggeredBy,
      names: new Map(registrations.map(({ id, ...name }) => [id, name])),
      currentInputVersion: row.term.accommodationState?.inputVersion ?? 0,
    };
  }
}
