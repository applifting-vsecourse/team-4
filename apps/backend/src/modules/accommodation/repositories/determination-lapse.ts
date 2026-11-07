import { Prisma } from '@/generated/prisma/client';

/**
 * Any change of the answer to the hard attribute cancels the organizer's
 * determination (spec v4 §4), even a later return to the same answer. Call
 * it in the transaction that changes the answer; the immutable record of the
 * determination stays in the history.
 */
export async function answerChanged(
  tx: Prisma.TransactionClient,
  registrationId: string,
): Promise<void> {
  await tx.accommodationManualValue.deleteMany({ where: { registrationId } });
}
