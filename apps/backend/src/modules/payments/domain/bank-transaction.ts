import { StatementTransaction } from '@/modules/payments/domain/bank-statement';

/** A stored received transaction of the event (F23). */
export type BankTransactionModel = StatementTransaction & {
  id: string;
  importedAt: Date;
};

/** What one import did (F23) and the pairing that followed it (F24). */
export type StatementImportModel = {
  /** Incoming movements in the file. */
  received: number;
  /** Of them, new to the event. */
  imported: number;
  /** Of them, already imported before. */
  duplicates: number;
  /** Outgoing movements in the file, never imported. */
  skippedOutgoing: number;
  /**
   * Transactions of the event paired by their variable symbol after the
   * import, also ones that waited in the queue from an earlier import.
   */
  paired: number;
};

/** The organizer's manual pairing of a queued transaction (F24). */
export type ManualPairingInput = {
  registrationId: string;
  /** Why the transaction belongs to the registration; required. */
  reason: string;
};
