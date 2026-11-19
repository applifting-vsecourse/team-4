import { z } from "zod"

/** A received transaction of an imported bank statement (F23). */
export const bankTransactionSchema = z.object({
  id: z.string().uuid(),
  bankTransactionId: z.string(),
  bookedOn: z.string(),
  amountMinor: z.number().int().positive(),
  variableSymbol: z.string().nullable(),
  counterpartyAccount: z.string().nullable(),
  counterpartyName: z.string().nullable(),
  message: z.string().nullable(),
  importedAt: z.string(),
})

/** The event's queue: transactions not paired with any registration (F24). */
export const bankTransactionsSchema = z.object({
  transactions: z.array(bankTransactionSchema),
})

/**
 * What one import did: incoming movements of the file, new, already known,
 * outgoing, and how many of the event's transactions were then paired by
 * their variable symbol (F24).
 */
export const statementImportSchema = z.object({
  received: z.number().int().nonnegative(),
  imported: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  skippedOutgoing: z.number().int().nonnegative(),
  paired: z.number().int().nonnegative(),
})

/** A registration of the event that a transaction can be paired with by hand. */
export const registrationOptionSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
})

/** The part of the event's registration list the pairing dialog offers. */
export const registrationOptionsSchema = z.object({
  registrations: z.array(registrationOptionSchema),
})

/** The organizer's manual pairing; the reason is required (F24). */
export type ManualPairing = { registrationId: string; reason: string }

export type BankTransaction = z.infer<typeof bankTransactionSchema>
export type StatementImport = z.infer<typeof statementImportSchema>
export type RegistrationOption = z.infer<typeof registrationOptionSchema>
