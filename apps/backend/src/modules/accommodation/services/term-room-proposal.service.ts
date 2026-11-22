import {
  buildProposalView,
  ProposalTermView,
} from '@/modules/accommodation/domain/proposal-view';
import { ProposalQueueRepository } from '@/modules/accommodation/repositories/proposal-queue.repository';
import { RoomProposalRepository } from '@/modules/accommodation/repositories/room-proposal.repository';
import {
  EvaluationMode,
  TermEvaluationRepository,
} from '@/modules/accommodation/repositories/term-evaluation.repository';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

/** A foreign or missing event or term looks the same (§3.2). */
const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

export type TermRoomProposal = ProposalTermView & {
  mode: EvaluationMode;
  /** When the next proposal is due; null when none is scheduled. */
  scheduledAt: Date | null;
};

/**
 * The organizer's room proposal of a term (#365, spec §7): the automatic
 * proposal setting, the view of a term's last proposal and "Navrhnout
 * pokoje". Reading never proposes; a request is queued for the proposal
 * worker. "Použít návrh" saves placements, so it lives with them
 * (`RoomPlacementsService.apply`).
 */
@Injectable()
export class TermRoomProposalService {
  constructor(
    private readonly repository: RoomProposalRepository,
    private readonly queue: ProposalQueueRepository,
    private readonly terms: TermEvaluationRepository,
  ) {}

  async mode(scope: EventScope): Promise<EvaluationMode> {
    const automatic = await this.repository.findAutomatic(scope);
    if (automatic === null) throw notAvailable();
    return automatic ? 'automatic' : 'manual';
  }

  /** Switching never proposes or changes a saved placement by itself. */
  async saveMode(
    scope: EventScope,
    mode: EvaluationMode,
  ): Promise<EvaluationMode> {
    const saved = await this.repository.saveAutomatic(
      scope,
      mode === 'automatic',
    );
    if (!saved) throw notAvailable();
    return mode;
  }

  async term(scope: EventScope, termId: string): Promise<TermRoomProposal> {
    const [mode, state] = await Promise.all([
      this.repository.findAutomatic(scope),
      this.repository.findTermState(scope, termId),
    ]);
    if (mode === null || !state) throw notAvailable();
    return {
      mode: mode ? 'automatic' : 'manual',
      scheduledAt: state.scheduledAt,
      ...buildProposalView(state),
    };
  }

  /**
   * "Navrhnout pokoje", in either mode: the term is proposed right away,
   * after a running proposal if there is one. No saved placement changes.
   */
  async propose(scope: EventScope, termId: string): Promise<TermRoomProposal> {
    if (!(await this.terms.isTermInScope(scope, termId))) throw notAvailable();
    await this.queue.request(scope.eventId, termId, scope.ownerId);
    return this.term(scope, termId);
  }
}
