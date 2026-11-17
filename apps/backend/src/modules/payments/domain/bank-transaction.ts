import { StatementTransaction } from '@/modules/payments/domain/bank-statement';

/** A stored received transaction of the event (F23). */
export type BankTransactionModel = StatementTransaction & {
  id: string;
  importedAt: Date;
};

/** What one import did; nothing else changes, payments come with pairing (F24). */
export type StatementImportModel = {
  /** Incoming movements in the file. */
  received: number;
  /** Of them, new to the event. */
  imported: number;
  /** Of them, already imported before. */
  duplicates: number;
  /** Outgoing movements in the file, never imported. */
  skippedOutgoing: number;
};
