import { buildEvaluation } from '@/modules/accommodation/domain/evaluation-input';
import {
  AccommodationEvaluationRepository,
  AccommodationRunModel,
} from '@/modules/accommodation/repositories/accommodation-evaluation.repository';
import { HardAttributeAnswers } from '@/modules/accommodation/services/hard-attribute-answers';
import { solveAssignmentInWorker } from '@/modules/accommodation/solver/solver-runner';
import { SolverResult } from '@/modules/accommodation/solver/solver.types';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Stored with every run. Bump it whenever the evaluation could decide
 * differently from the same input, so a stored proposal can be explained.
 */
export const SOLVER_VERSION = 'highs-phase1/1';

export type EvaluationOptions = {
  /** The organizer who asked for it; null when the system did. */
  triggeredById: string | null;
  /** Wall-clock limit of the solver (spec: 30 s per term). */
  timeLimitMs?: number;
};

/**
 * The proposal for one term (S3-T4, spec v4 §7): who of the unconfirmed
 * participants is suitable, why the others are not, or the conflict of the
 * confirmed ones. It reads the term as it is now and stores the run with
 * everything it decided from. It never confirms, waitlists, creates a debt
 * or assigns a room: F13-1 and F14-1 act on the proposal.
 */
@Injectable()
export class AccommodationEvaluationService {
  private readonly logger = new Logger(AccommodationEvaluationService.name);

  constructor(
    private readonly repository: AccommodationEvaluationRepository,
    private readonly answers: HardAttributeAnswers,
  ) {}

  /** Null when the term is not one of the event's. */
  async evaluateTerm(
    eventId: string,
    termId: string,
    { triggeredById, timeLimitMs }: EvaluationOptions,
  ): Promise<AccommodationRunModel | null> {
    const startedAt = new Date();
    const term = await this.repository.findTerm(eventId, termId);
    if (!term) return null;

    const attribute = term.rules.hardAttribute?.attribute;
    const answers = attribute
      ? await this.answers.answers(
          eventId,
          attribute,
          term.participants.map((participant) => participant.registrationId),
        )
      : new Map<string, string | null>();
    const { input, snapshot } = buildEvaluation(
      term.rules,
      term.rooms,
      term.participants.map((participant) => ({
        ...participant,
        answer: answers.get(participant.registrationId) ?? null,
      })),
      term.storedOrder,
    );

    let result: SolverResult | null = null;
    let error: string | null = null;
    try {
      result = await solveAssignmentInWorker(input, { phase: 1, timeLimitMs });
    } catch (failure) {
      // Stored as a failed run; the valid participations stay as they are.
      error = failure instanceof Error ? failure.message : String(failure);
      this.logger.error(`Evaluation of term ${termId} failed: ${error}`);
    }

    return this.repository.createRun({
      eventId,
      termId,
      status: result?.status ?? 'failed',
      triggeredById,
      solverVersion: SOLVER_VERSION,
      input: snapshot,
      result,
      error,
      startedAt,
      finishedAt: new Date(),
    });
  }
}
