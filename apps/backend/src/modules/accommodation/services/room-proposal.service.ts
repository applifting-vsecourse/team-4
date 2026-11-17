import {
  buildProposal,
  softAttributesOf,
} from '@/modules/accommodation/domain/proposal-input';
import {
  RoomProposalModel,
  RoomProposalRepository,
} from '@/modules/accommodation/repositories/room-proposal.repository';
import { HardAttributeAnswers } from '@/modules/accommodation/services/hard-attribute-answers';
import {
  RoommateWishes,
  RoomPlacements,
} from '@/modules/accommodation/services/room-proposal-sources';
import { RoomProposalResult } from '@/modules/accommodation/solver/room-proposal.types';
import { solveRoomProposalInWorker } from '@/modules/accommodation/solver/solver-runner';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Stored with every proposal. Bump it whenever a proposal could come out
 * differently from the same input (ADR-0002), so a stored one can be explained.
 */
export const PROPOSAL_SOLVER_VERSION = 'room-proposal-search/1';

export type ProposalOptions = {
  /** The organizer who asked for it; null when the system did. */
  triggeredById: string | null;
  /** The id of a claimed proposal; generated otherwise. */
  proposalId?: string;
  /**
   * The layout version the proposal stands for: the claim's, read before the
   * input, so a change in between makes the proposal stale, never falsely current.
   */
  layoutVersion: number;
  /** Wall-clock limit of the solver (spec: 30 s per term). */
  timeLimitMs?: number;
};

/**
 * The room proposal of one term (#365, spec §7): it lays out the term's
 * confirmed participants in rooms from the term as it is now and stores an
 * immutable record of it. It never changes a stored placement or anyone's
 * participation; applying it is a separate step.
 */
@Injectable()
export class RoomProposalService {
  private readonly logger = new Logger(RoomProposalService.name);

  constructor(
    private readonly repository: RoomProposalRepository,
    private readonly answers: HardAttributeAnswers,
    private readonly placements: RoomPlacements,
    private readonly wishes: RoommateWishes,
  ) {}

  /** Null when the term is not one of the event's. */
  async proposeTerm(
    eventId: string,
    termId: string,
    { triggeredById, proposalId, layoutVersion, timeLimitMs }: ProposalOptions,
  ): Promise<RoomProposalModel | null> {
    const startedAt = new Date();
    const term = await this.repository.findTerm(eventId, termId);
    if (!term) return null;

    const ids = term.people.map((person) => person.registrationId);
    const attribute = term.rules.hardAttribute?.attribute;
    const [hardAnswers, softAnswers, placements, wishes] = await Promise.all([
      attribute
        ? this.answers.answers(eventId, attribute, ids)
        : Promise.resolve(new Map<string, string | null>()),
      Promise.all(
        softAttributesOf(term.rules).map(
          async (soft) =>
            [soft, await this.answers.answers(eventId, soft, ids)] as const,
        ),
      ),
      this.placements.placements(eventId, termId, ids),
      this.wishes.wishes(eventId, termId, ids),
    ]);
    const snapshot = buildProposal(
      term.rules,
      term.rooms,
      term.people.map((person) => ({
        ...person,
        answer: hardAnswers.get(person.registrationId) ?? null,
        softAnswers: Object.fromEntries(
          softAnswers.map(([soft, byPerson]) => [
            soft,
            byPerson.get(person.registrationId) ?? null,
          ]),
        ),
      })),
      placements,
      wishes,
    );

    let result: RoomProposalResult | null = null;
    let error: string | null = null;
    try {
      result = await solveRoomProposalInWorker(snapshot.input, { timeLimitMs });
    } catch (failure) {
      // Stored as a failed proposal; the stored placements stay as they are.
      error = failure instanceof Error ? failure.message : String(failure);
      this.logger.error(`Room proposal of term ${termId} failed: ${error}`);
    }

    return this.repository.createProposal({
      id: proposalId,
      eventId,
      termId,
      status: result?.status ?? 'failed',
      triggeredById,
      solverVersion: PROPOSAL_SOLVER_VERSION,
      input: snapshot,
      result,
      error,
      layoutVersion,
      startedAt,
      finishedAt: new Date(),
    });
  }
}
