import { ParticipantUpdatesRepository } from '@/modules/registrations/repositories/participant-updates.repository';
import { ParticipantUpdateService } from '@/modules/registrations/services/participant-update.service';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

/** How often decisions are looked for; `0` turns the poller off (tests). */
const intervalMs = (): number =>
  Number(process.env.RESULT_MAIL_INTERVAL_MS ?? 5000);

const BATCH = 50;

/**
 * Turns the result events of participation decisions (S3-02) into participant
 * e-mails (F45-1). It only reads them: a decision never waits for, or is
 * undone by, its message. A result is queued once (key `result:<id>`) however
 * often it is scanned, and a result that cannot be built ends as a failed
 * delivery instead of being retried forever.
 */
@Injectable()
export class ParticipantResultMailService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParticipantResultMailService.name);
  private timer: NodeJS.Timeout | undefined;
  private scanning: Promise<number> | undefined;

  constructor(
    private readonly repository: ParticipantUpdatesRepository,
    private readonly updates: ParticipantUpdateService,
  ) {}

  onModuleInit(): void {
    const every = intervalMs();
    if (every <= 0) return;
    this.timer = setInterval(() => void this.scan(), every);
    // Polling alone never keeps the process alive.
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.scanning;
    await this.updates.settle();
  }

  /** One round, never two at once in this process. Resolves to the e-mails queued. */
  scan(): Promise<number> {
    this.scanning ??= this.queueUnmailed().finally(
      () => (this.scanning = undefined),
    );
    return this.scanning;
  }

  private async queueUnmailed(): Promise<number> {
    let queued = 0;
    try {
      for (const event of await this.repository.findUnmailedResults(BATCH)) {
        try {
          if (await this.repository.queueResult(event)) {
            queued += 1;
            this.updates.dispatch(event.registrationId);
          }
        } catch (error) {
          // Only a failure of the database itself gets here (a message that
          // cannot be built is kept by the queue): the next scan tries again.
          this.logger.error(
            `Result ${event.id} was not queued: ${String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Scanning decision results failed: ${String(error)}`);
    }
    return queued;
  }
}
