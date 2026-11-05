import {
  ClaimedEvaluation,
  EvaluationQueueRepository,
} from '@/modules/accommodation/repositories/evaluation-queue.repository';
import { AccommodationEvaluationService } from '@/modules/accommodation/services/accommodation-evaluation.service';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

/** How often due evaluations are looked for; `0` turns the poller off (tests). */
const intervalMs = (): number =>
  Number(process.env.ACCOMMODATION_WORKER_INTERVAL_MS ?? 1000);

/** Evaluations run at once by one process; each one already has a worker thread. */
const BATCH = 2;

/**
 * Runs the due evaluations of terms (S3-01, spec v4 §5) in this process: the
 * automatic ones 10 s after the last change and those the organizer asked for.
 * The state row is the queue, so every backend process may poll it.
 */
@Injectable()
export class EvaluationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EvaluationWorker.name);
  private timer: NodeJS.Timeout | undefined;
  private polling: Promise<number> | undefined;

  constructor(
    private readonly queue: EvaluationQueueRepository,
    private readonly evaluation: AccommodationEvaluationService,
  ) {}

  onModuleInit(): void {
    const every = intervalMs();
    if (every <= 0) return;
    this.timer = setInterval(() => void this.poll(), every);
    // Polling alone never keeps the process alive.
    this.timer.unref();
  }

  /** Stops polling and lets a running evaluation store its run; the database closes later. */
  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.polling;
  }

  /** Runs everything of one event due now, until nothing is left (tests). */
  async drain(eventId: string): Promise<void> {
    while ((await this.runDue(eventId)) > 0);
  }

  /** One round; never two at once in this process. Resolves to the evaluations run. */
  private poll(): Promise<number> {
    this.polling ??= this.runDue().finally(() => (this.polling = undefined));
    return this.polling;
  }

  private async runDue(eventId: string | null = null): Promise<number> {
    let claimed: ClaimedEvaluation[];
    try {
      claimed = await this.queue.claimDue(BATCH, eventId);
    } catch (error) {
      this.logger.error(`Claiming due evaluations failed: ${String(error)}`);
      return 0;
    }
    await Promise.all(claimed.map((evaluation) => this.run(evaluation)));
    return claimed.length;
  }

  private async run(claimed: ClaimedEvaluation): Promise<void> {
    try {
      // A solver failure is stored as a failed run by the service itself.
      await this.evaluation.evaluateTerm(claimed.eventId, claimed.termId, {
        runId: claimed.runId,
        inputVersion: claimed.inputVersion,
        triggeredById: claimed.triggeredById,
      });
    } catch (error) {
      this.logger.error(
        `Evaluation ${claimed.runId} of term ${claimed.termId} was not stored: ${String(error)}`,
      );
    } finally {
      await this.queue.release(claimed.termId, claimed.runId).catch(() => {
        // Left running, it is taken again once abandoned.
      });
    }
  }
}
