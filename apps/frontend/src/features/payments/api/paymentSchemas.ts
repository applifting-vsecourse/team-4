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

export const bankTransactionsSchema = z.object({
  transactions: z.array(bankTransactionSchema),
})

/** What one import did: incoming movements of the file, new, already known, outgoing. */
export const statementImportSchema = z.object({
  received: z.number().int().nonnegative(),
  imported: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  skippedOutgoing: z.number().int().nonnegative(),
})

export type BankTransaction = z.infer<typeof bankTransactionSchema>
export type StatementImport = z.infer<typeof statementImportSchema>
