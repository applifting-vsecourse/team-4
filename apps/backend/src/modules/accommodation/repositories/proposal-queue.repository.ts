import { PrismaService } from '@/core/prisma/prisma.service';
import { ABANDONED_AFTER_SECONDS } from '@/modules/accommodation/repositories/evaluation-queue.repository';
import { Injectable } from '@nestjs/common';

/** A room proposal taken by this process: it will be stored under `proposalId`. */
export type ClaimedProposal = {
  termId: string;
  eventId: string;
  proposalId: string;
  /** The term's layout version when the proposal started. */
  layoutVersion: number;
  /** Who asked for it; null when the system scheduled it. */
  triggeredById: string | null;
};

/**
 * Due room proposals of terms (spec §7), queued on the term state row beside
 * its evaluation, the same way: at most one proposal runs per term, and a
 * change while it runs schedules the next one.
 */
@Injectable()
export class ProposalQueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Takes up to `limit` due proposals that no one runs, skipping rows other
   * processes hold. `eventId` limits it to one event (tests).
   */
  async claimDue(
    limit: number,
    eventId: string | null = null,
  ): Promise<ClaimedProposal[]> {
    return this.prisma.$queryRaw<ClaimedProposal[]>`
      WITH due AS (
        SELECT "termId" FROM "accommodation_term_state"
        WHERE (("proposalDueAt" <= now() AND "proposalRunningId" IS NULL)
           OR "proposalRunningSince" < now() - make_interval(secs => ${ABANDONED_AFTER_SECONDS}))
          AND (${eventId}::uuid IS NULL OR "eventId" = ${eventId}::uuid)
        ORDER BY "proposalDueAt" NULLS FIRST, "termId"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "accommodation_term_state" s SET
        "proposalRunningId" = gen_random_uuid(),
        "proposalRunningVersion" = s."layoutVersion",
        "proposalRunningById" = CASE WHEN s."proposalDueAt" <= now() THEN s."proposalRequestedById" ELSE s."proposalRunningById" END,
        "proposalRunningSince" = now(),
        "proposalDueAt" = CASE WHEN s."proposalDueAt" <= now() THEN NULL ELSE s."proposalDueAt" END,
        "proposalRequestedById" = CASE WHEN s."proposalDueAt" <= now() THEN NULL ELSE s."proposalRequestedById" END
      FROM due WHERE s."termId" = due."termId"
      RETURNING s."termId", s."eventId", s."proposalRunningId" AS "proposalId",
                s."proposalRunningVersion" AS "layoutVersion",
                s."proposalRunningById" AS "triggeredById"`;
  }

  /** The proposal ended (stored, or it failed to store); the term is free. */
  async release(termId: string, proposalId: string): Promise<void> {
    await this.prisma.accommodationTermState.updateMany({
      where: { termId, proposalRunningId: proposalId },
      data: {
        proposalRunningId: null,
        proposalRunningVersion: null,
        proposalRunningById: null,
        proposalRunningSince: null,
      },
    });
  }

  /**
   * "Navrhnout pokoje", with automatic proposals on or off: due now. A
   * running proposal finishes first; the requested one follows.
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
        INSERT INTO "accommodation_term_state" ("termId", "eventId", "proposalDueAt", "proposalRequestedById")
        VALUES (${termId}::uuid, ${eventId}::uuid, now(), ${requestedById})
        ON CONFLICT ("termId") DO UPDATE SET
          "proposalDueAt" = now(), "proposalRequestedById" = EXCLUDED."proposalRequestedById"`,
    ]);
  }
}
