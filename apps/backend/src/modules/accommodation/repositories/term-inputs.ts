import { Prisma } from '@/generated/prisma/client';

/** Automatic mode: a term is evaluated this long after its last change (spec v4 §5). */
export const DEBOUNCE_SECONDS = 10;

/**
 * Records that the inputs of terms changed (S3-01, spec v4 §5): a
 * registration or its change in the term, a room and its beds. Their version
 * goes up, which makes their proposals stale. In the automatic mode each
 * evaluation becomes due 10 s after the last change; an evaluation the
 * organizer asked for keeps its time. Call it in the transaction that makes
 * the change, so the version moves with it. Without `termIds`, every term of
 * the event.
 *
 * The terms are key-share locked in id order first: the state row's foreign
 * key takes that lock anyway, and taking it before the state row keeps the
 * order every writer uses (term, then state), so a first insert cannot
 * deadlock with a transaction that holds the term `FOR UPDATE`.
 */
export async function termInputsChanged(
  tx: Prisma.TransactionClient,
  eventId: string,
  termIds?: readonly string[],
): Promise<void> {
  if (termIds?.length === 0) return;
  await tx.$queryRaw`
    SELECT "id" FROM "event_term"
    WHERE "eventId" = ${eventId}::uuid
      AND (${termIds ?? null}::uuid[] IS NULL OR "id" = ANY(${termIds ?? null}::uuid[]))
    ORDER BY "id" FOR KEY SHARE`;
  await tx.$executeRaw`
    INSERT INTO "accommodation_term_state" ("termId", "eventId", "inputVersion", "dueAt")
    SELECT t."id", t."eventId", 1,
           CASE WHEN e."accommodationEvaluationMode" = 'automatic'
                THEN now() + make_interval(secs => ${DEBOUNCE_SECONDS}) END
    FROM "event_term" t JOIN "event" e ON e."id" = t."eventId"
    WHERE t."eventId" = ${eventId}::uuid
      AND (${termIds ?? null}::uuid[] IS NULL OR t."id" = ANY(${termIds ?? null}::uuid[]))
    ORDER BY t."id"
    ON CONFLICT ("termId") DO UPDATE SET
      "inputVersion" = "accommodation_term_state"."inputVersion" + 1,
      "dueAt" = CASE
        WHEN "accommodation_term_state"."requestedById" IS NOT NULL
          OR EXCLUDED."dueAt" IS NULL THEN "accommodation_term_state"."dueAt"
        ELSE EXCLUDED."dueAt" END`;
}
