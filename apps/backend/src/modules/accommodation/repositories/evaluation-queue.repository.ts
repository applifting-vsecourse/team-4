import { PrismaService } from '@/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

/** An evaluation taken by this process: it will store the run under `runId`. */
export type ClaimedEvaluation = {
  termId: string;
  eventId: string;
  runId: string;
  /** The term's input version when the evaluation started. */
  inputVersion: number;
  /** Who asked for it; null when the system scheduled it. */
  triggeredById: string | null;
};

/**
 * A running evaluation older than this is taken as lost (the process ended)
 * and may be taken again; the solver gives up after 30 s.
 */
export const ABANDONED_AFTER_SECONDS = 120;

/**
 * Due evaluations of terms (spec v4 §5). The term state row is the queue: at
 * most one evaluation runs per term, and a change while it runs schedules the
 * next one, which waits until this one is stored.
 */
@Injectable()
export class EvaluationQueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Takes up to `limit` due evaluations that no one runs. Rows locked by
   * another process are skipped, so several processes never take the same term.
   * `eventId` limits it to one event (tests on a shared database).
   */
  async claimDue(
    limit: number,
    eventId: string | null = null,
  ): Promise<ClaimedEvaluation[]> {
    return this.prisma.$queryRaw<ClaimedEvaluation[]>`
      WITH due AS (
        SELECT "termId" FROM "accommodation_term_state"
        WHERE (("dueAt" <= now() AND "runningRunId" IS NULL)
           OR "runningSince" < now() - make_interval(secs => ${ABANDONED_AFTER_SECONDS}))
          AND (${eventId}::uuid IS NULL OR "eventId" = ${eventId}::uuid)
        ORDER BY "dueAt" NULLS FIRST, "termId"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "accommodation_term_state" s SET
        "runningRunId" = gen_random_uuid(),
        "runningVersion" = s."inputVersion",
        "runningById" = CASE WHEN s."dueAt" <= now() THEN s."requestedById" ELSE s."runningById" END,
        "runningSince" = now(),
        "dueAt" = CASE WHEN s."dueAt" <= now() THEN NULL ELSE s."dueAt" END,
        "requestedById" = CASE WHEN s."dueAt" <= now() THEN NULL ELSE s."requestedById" END
      FROM due WHERE s."termId" = due."termId"
      RETURNING s."termId", s."eventId", s."runningRunId" AS "runId",
                s."runningVersion" AS "inputVersion", s."runningById" AS "triggeredById"`;
  }

  /** The evaluation ended (its run is stored or it failed to store); the term is free. */
  async release(termId: string, runId: string): Promise<void> {
    await this.prisma.accommodationTermState.updateMany({
      where: { termId, runningRunId: runId },
      data: {
        runningRunId: null,
        runningVersion: null,
        runningById: null,
        runningSince: null,
      },
    });
  }

  /**
   * The organizer's "Přepočítat", in either mode: due now. A running
   * evaluation finishes first; the requested one follows.
   */
  async request(
    eventId: string,
    termId: string,
    requestedById: string,
  ): Promise<void> {
    // The term first, then its state, as every writer does (see term-inputs).
    await this.prisma.$transaction([
      this.prisma.$queryRaw`
        SELECT "id" FROM "event_term"
        WHERE "id" = ${termId}::uuid AND "eventId" = ${eventId}::uuid
        FOR KEY SHARE`,
      this.prisma.$executeRaw`
        INSERT INTO "accommodation_term_state" ("termId", "eventId", "dueAt", "requestedById")
        VALUES (${termId}::uuid, ${eventId}::uuid, now(), ${requestedById})
        ON CONFLICT ("termId") DO UPDATE SET
          "dueAt" = now(), "requestedById" = EXCLUDED."requestedById"`,
    ]);
  }
}
