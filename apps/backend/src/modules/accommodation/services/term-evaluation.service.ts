import {
  buildTermView,
  TermEvaluationView,
} from '@/modules/accommodation/domain/term-evaluation';
import { EvaluationQueueRepository } from '@/modules/accommodation/repositories/evaluation-queue.repository';
import {
  EvaluationMode,
  RunEvidence,
  RunListItem,
  TermEvaluationRepository,
  TermSummary,
} from '@/modules/accommodation/repositories/term-evaluation.repository';
import { HardAttributeAnswers } from '@/modules/accommodation/services/hard-attribute-answers';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

/** A foreign or missing event, term or run looks the same (§3.2). */
const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

export type TermEvaluation = {
  mode: EvaluationMode;
  term: TermSummary;
  /** The hard attribute of the event (spec v4 §2); null when there is none. */
  hardAttribute: { attribute: string; nonDeterminingValues: string[] } | null;
  hasRooms: boolean;
  /** When the next evaluation is due; null when none is scheduled. */
  scheduledAt: Date | null;
  view: TermEvaluationView;
};

/**
 * The organizer's term evaluation (S3-01): the evaluation mode, the view of a
 * term, a recalculation on request and the evidence of every run. Reading
 * never evaluates; a recalculation is queued for the evaluation worker.
 */
@Injectable()
export class TermEvaluationService {
  constructor(
    private readonly repository: TermEvaluationRepository,
    private readonly queue: EvaluationQueueRepository,
    private readonly answers: HardAttributeAnswers,
  ) {}

  async mode(scope: EventScope): Promise<EvaluationMode> {
    const mode = await this.repository.findMode(scope);
    if (!mode) throw notAvailable();
    return mode;
  }

  /** Switching never evaluates or changes a participation by itself. */
  async saveMode(
    scope: EventScope,
    mode: EvaluationMode,
  ): Promise<EvaluationMode> {
    if (!(await this.repository.saveMode(scope, mode))) throw notAvailable();
    return mode;
  }

  async term(scope: EventScope, termId: string): Promise<TermEvaluation> {
    const data = await this.repository.findTerm(scope, termId);
    if (!data) throw notAvailable();
    const hard = data.rules.hardAttribute;
    const answers = hard
      ? await this.answers.answers(
          scope.eventId,
          hard.attribute,
          data.people.map((person) => person.registrationId),
        )
      : new Map<string, string | null>();
    return {
      mode: data.mode,
      term: data.term,
      hardAttribute: hard && {
        attribute: hard.attribute,
        nonDeterminingValues: [...hard.nonDeterminingValues],
      },
      hasRooms: data.hasRooms,
      scheduledAt: data.scheduledAt,
      view: buildTermView({
        ...data,
        // A recalculation the organizer asked for counts as running at once.
        isRunning: data.isRunning || data.isRequested,
        people: data.people.map((person) => ({
          ...person,
          answer: answers.get(person.registrationId) ?? null,
        })),
      }),
    };
  }

  /**
   * "Přepočítat", in either mode: the term is evaluated right away, after a
   * running evaluation if there is one. Nothing is confirmed or owed.
   */
  async recalculate(
    scope: EventScope,
    termId: string,
  ): Promise<TermEvaluation> {
    if (!(await this.repository.isTermInScope(scope, termId))) {
      throw notAvailable();
    }
    await this.queue.request(scope.eventId, termId, scope.ownerId);
    return this.term(scope, termId);
  }

  async runs(
    scope: EventScope,
    termId: string,
  ): Promise<{ inputVersion: number; runs: RunListItem[] }> {
    const runs = await this.repository.findRuns(scope, termId);
    if (!runs) throw notAvailable();
    return runs;
  }

  async run(scope: EventScope, runId: string): Promise<RunEvidence> {
    const run = await this.repository.findRun(scope, runId);
    if (!run) throw notAvailable();
    return run;
  }
}
