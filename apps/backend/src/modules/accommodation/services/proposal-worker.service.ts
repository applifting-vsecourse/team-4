import {
  ClaimedProposal,
  ProposalQueueRepository,
} from '@/modules/accommodation/repositories/proposal-queue.repository';
import { RoomProposalService } from '@/modules/accommodation/services/room-proposal.service';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

/** How often due proposals are looked for; `0` turns the poller off (tests). */
const intervalMs = (): number =>
  Number(process.env.ACCOMMODATION_WORKER_INTERVAL_MS ?? 1000);

/** One proposal at a time per process: each one keeps a CPU busy for seconds. */
const BATCH = 1;

/**
 * Runs the due room proposals of terms (spec §7) in this process: the
 * automatic ones 10 s after the last layout change and those the organizer
 * asked for. The state row is the queue, so every backend process may poll it.
 */
@Injectable()
export class ProposalWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProposalWorker.name);
  private timer: NodeJS.Timeout | undefined;
  private polling: Promise<number> | undefined;

  constructor(
    private readonly queue: ProposalQueueRepository,
    private readonly proposals: RoomProposalService,
  ) {}

  onModuleInit(): void {
    const every = intervalMs();
    if (every <= 0) return;
    this.timer = setInterval(() => void this.poll(), every);
    // Polling alone never keeps the process alive.
    this.timer.unref();
  }

  /** Stops polling and lets a running proposal store itself. */
  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.polling;
  }

  /** Runs everything of one event due now, until nothing is left (tests). */
  async drain(eventId: string): Promise<void> {
    while ((await this.runDue(eventId)) > 0);
  }

  /** One round; never two at once in this process. */
  private poll(): Promise<number> {
    this.polling ??= this.runDue().finally(() => (this.polling = undefined));
    return this.polling;
  }

  private async runDue(eventId: string | null = null): Promise<number> {
    let claimed: ClaimedProposal[];
    try {
      claimed = await this.queue.claimDue(BATCH, eventId);
    } catch (error) {
      this.logger.error(`Claiming due proposals failed: ${String(error)}`);
      return 0;
    }
    await Promise.all(claimed.map((proposal) => this.run(proposal)));
    return claimed.length;
  }

  private async run(claimed: ClaimedProposal): Promise<void> {
    try {
      // A solver failure is stored as a failed proposal by the service itself.
      await this.proposals.proposeTerm(claimed.eventId, claimed.termId, {
        proposalId: claimed.proposalId,
        layoutVersion: claimed.layoutVersion,
        triggeredById: claimed.triggeredById,
      });
    } catch (error) {
      this.logger.error(
        `Room proposal ${claimed.proposalId} of term ${claimed.termId} was not stored: ${String(error)}`,
      );
    } finally {
      await this.queue.release(claimed.termId, claimed.proposalId).catch(() => {
        // Left running, it is taken again once abandoned.
      });
    }
  }
}
