import {
  effectiveValue,
  ManualValue,
} from '@/modules/accommodation/domain/effective-value';
import {
  AccommodationRules,
  TermRoom,
} from '@/modules/accommodation/domain/evaluation-input';
import { termOrder } from '@/modules/accommodation/domain/term-order';
import {
  SolverResult,
  UnplacedReason,
} from '@/modules/accommodation/solver/solver.types';

// The organizer's view of one term's evaluation (S3-01, spec v4 §5–§7): the
// order and queues as the term is now, with the result of the shown proposal
// beside them. A proposal is current only while the term's input version is
// the one its run read.

export type RunStatus = 'solved' | 'infeasible' | 'timeout' | 'failed';

/**
 * current / stale: the shown proposal matches / no longer matches the inputs.
 * running: an evaluation is in progress. failed / timeout: the last one did
 * not finish. infeasible: the confirmed no longer fit. none: never evaluated.
 */
export type EvaluationStatus =
  | 'none'
  | 'running'
  | 'current'
  | 'stale'
  | 'failed'
  | 'timeout'
  | 'infeasible';

export type ParticipationState = 'pending' | 'confirmed' | 'waitlisted';

/** An active participation in the term, as it is now. */
export type TermPerson = {
  registrationId: string;
  firstName: string;
  lastName: string;
  receivedAt: Date;
  status: ParticipationState;
  /** The answer to the hard attribute; null when not given. */
  answer: string | null;
  manualValue: ManualValue | null;
};

/** A stored run, as far as the view needs it. */
export type RunOutcome = {
  id: string;
  status: RunStatus;
  inputVersion: number;
  finishedAt: Date;
  /** The proposal; null for a failed run. */
  result: SolverResult | null;
};

export type ProposalResult = 'suitable' | 'unsuitable' | 'manual';

export type OrderedPerson = {
  registrationId: string;
  firstName: string;
  lastName: string;
  receivedAt: Date;
  status: 'pending' | 'waitlisted';
  /** 1 is the highest priority in the whole term. */
  position: number;
  answer: string | null;
  /** The organizer's determination, while valid for the answer (spec v4 §4). */
  determinedValue: string | null;
  /** Null with a hard attribute: needs a manual determination (reason R). */
  effectiveValue: string | null;
  /** Missing when the shown proposal did not evaluate the person. */
  result?: ProposalResult;
  reason?: UnplacedReason;
};

/** A queue: the order filtered by one effective value; one for all without a hard attribute. */
export type QueueView = {
  /** Null for the single queue without a hard attribute. */
  value: string | null;
  pending: number;
  waitlisted: number;
  /** From the shown proposal; missing without one. */
  suitable?: number;
  unsuitable?: number;
};

export type CapacityView = {
  baseBeds: number;
  extraBeds: number;
  confirmed: number;
  pending: number;
  waitlisted: number;
  /** The impact of the shown proposal; missing without one. */
  proposal?: {
    suitable: number;
    /** Reasons A, B, C and N. */
    unsuitable: number;
    /** Reason R. */
    manual: number;
    baseUsed: number;
    extraUsed: number;
  };
};

export type ConflictView = {
  constraint: 'capacity' | 'homogeneity';
  /** The confirmed participants the solver named. */
  confirmed: { registrationId: string; firstName: string; lastName: string }[];
};

export type TermEvaluationView = {
  status: EvaluationStatus;
  inputVersion: number;
  /** The run whose proposal is shown; null without one. */
  proposalRun: { id: string; finishedAt: Date; isCurrent: boolean } | null;
  /** Set when the latest run found the confirmed no longer fit. */
  conflict: ConflictView | null;
  capacity: CapacityView;
  queues: QueueView[];
  /** Unconfirmed people with a hard attribute and no effective value. */
  manualCount: number;
  order: OrderedPerson[];
};

export function evaluationStatus(
  isRunning: boolean,
  latest: Pick<RunOutcome, 'status' | 'inputVersion'> | null,
  inputVersion: number,
): EvaluationStatus {
  if (isRunning) return 'running';
  if (!latest) return 'none';
  const isCurrent = latest.inputVersion === inputVersion;
  switch (latest.status) {
    case 'solved':
      return isCurrent ? 'current' : 'stale';
    case 'infeasible':
      return isCurrent ? 'infeasible' : 'stale';
    case 'failed':
    case 'timeout':
      return latest.status;
  }
}

/**
 * The proposal to show: the latest run's, or after a failed or timed-out run
 * the last solved one before it, then stale. A conflict leaves none.
 */
export function shownProposal(
  latest: RunOutcome | null,
  lastSolved: RunOutcome | null,
  lastInfeasible: RunOutcome | null,
): RunOutcome | null {
  if (!latest || latest.status === 'infeasible' || !lastSolved) return null;
  if (lastInfeasible && lastInfeasible.finishedAt > lastSolved.finishedAt) {
    return null;
  }
  return lastSolved;
}

type Solved = Extract<SolverResult, { status: 'solved' }>;

const resultOf = (
  proposal: Solved | null,
  registrationId: string,
): Pick<OrderedPerson, 'result' | 'reason'> => {
  if (!proposal) return {};
  if (proposal.suitable.includes(registrationId)) return { result: 'suitable' };
  const unplaced = proposal.unplaced.find(({ id }) => id === registrationId);
  if (!unplaced) return {};
  return unplaced.reason === 'R'
    ? { result: 'manual', reason: 'R' }
    : { result: 'unsuitable', reason: unplaced.reason };
};

export function buildTermView(input: {
  rules: AccommodationRules;
  rooms: TermRoom[];
  people: TermPerson[];
  storedOrder: readonly string[] | null;
  inputVersion: number;
  isRunning: boolean;
  latest: RunOutcome | null;
  lastSolved: RunOutcome | null;
  lastInfeasible: RunOutcome | null;
}): TermEvaluationView {
  const { rules, people, inputVersion, latest } = input;
  const hard = rules.hardAttribute;
  const shown = shownProposal(latest, input.lastSolved, input.lastInfeasible);
  const proposal =
    shown?.result?.status === 'solved' ? (shown.result as Solved) : null;

  const unconfirmed = people.filter(
    (person): person is TermPerson & { status: 'pending' | 'waitlisted' } =>
      person.status !== 'confirmed',
  );
  const byId = new Map(unconfirmed.map((p) => [p.registrationId, p]));
  const order: OrderedPerson[] = termOrder(unconfirmed, input.storedOrder).map(
    (id, index) => {
      const person = byId.get(id) as TermPerson & {
        status: 'pending' | 'waitlisted';
      };
      const manual =
        hard && person.manualValue?.basedOnAnswer === person.answer
          ? person.manualValue.value
          : null;
      return {
        registrationId: person.registrationId,
        firstName: person.firstName,
        lastName: person.lastName,
        receivedAt: person.receivedAt,
        status: person.status,
        position: index + 1,
        answer: person.answer,
        determinedValue: manual,
        effectiveValue: effectiveValue(hard, person.answer, person.manualValue),
        ...resultOf(proposal, person.registrationId),
      };
    },
  );

  const queueValues = hard
    ? [
        ...new Set(
          order.flatMap((entry) =>
            entry.effectiveValue === null ? [] : [entry.effectiveValue],
          ),
        ),
      ].sort()
    : [null];
  const queues: QueueView[] = queueValues.map((value) => {
    const members = order.filter(
      (entry) => !hard || entry.effectiveValue === value,
    );
    const count = (pick: (entry: OrderedPerson) => boolean): number =>
      members.filter(pick).length;
    return {
      value,
      pending: count((entry) => entry.status === 'pending'),
      waitlisted: count((entry) => entry.status === 'waitlisted'),
      ...(proposal
        ? {
            suitable: count((entry) => entry.result === 'suitable'),
            unsuitable: count((entry) => entry.result === 'unsuitable'),
          }
        : {}),
    };
  });

  const countOf = (status: ParticipationState): number =>
    people.filter((person) => person.status === status).length;
  const conflictRun =
    latest?.status === 'infeasible' &&
    latest.result?.status === 'infeasible' &&
    latest.inputVersion === inputVersion
      ? latest.result
      : null;
  const names = new Map(people.map((p) => [p.registrationId, p]));

  return {
    status: evaluationStatus(input.isRunning, latest, inputVersion),
    inputVersion,
    proposalRun: shown
      ? {
          id: shown.id,
          finishedAt: shown.finishedAt,
          // After a failed or timed-out run it is shown as stale (spec v4 §5).
          isCurrent:
            shown.id === latest?.id && shown.inputVersion === inputVersion,
        }
      : null,
    conflict: conflictRun
      ? {
          constraint: conflictRun.constraint,
          confirmed: conflictRun.conflicting.map((registrationId) => ({
            registrationId,
            firstName: names.get(registrationId)?.firstName ?? '',
            lastName: names.get(registrationId)?.lastName ?? '',
          })),
        }
      : null,
    capacity: {
      baseBeds: input.rooms.reduce((sum, room) => sum + room.baseBeds, 0),
      extraBeds: input.rooms.reduce((sum, room) => sum + room.extraBeds, 0),
      confirmed: countOf('confirmed'),
      pending: countOf('pending'),
      waitlisted: countOf('waitlisted'),
      ...(proposal
        ? {
            proposal: {
              suitable: proposal.suitable.length,
              unsuitable: proposal.unplaced.filter(
                ({ reason }) => reason !== 'R',
              ).length,
              manual: proposal.unplaced.filter(({ reason }) => reason === 'R')
                .length,
              baseUsed: proposal.beds.baseUsed,
              extraUsed: proposal.beds.extraUsed,
            },
          }
        : {}),
    },
    queues,
    manualCount: hard
      ? order.filter((entry) => entry.effectiveValue === null).length
      : 0,
    order,
  };
}
