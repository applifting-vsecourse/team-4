import {
  bankTransactionsSchema,
  statementImportSchema,
  type BankTransaction,
  type StatementImport,
} from "@/features/payments/api/paymentSchemas"

// Preview data, parsed with the API schema so it can't drift from the
// contract. The queue (F24) holds what pairing by variable symbol left: a
// mistyped symbol (the registration fixtures use 1001–1004) and none at all.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

export const BANK_TRANSACTIONS: BankTransaction[] = bankTransactionsSchema.parse({
  transactions: [
    {
      id: uuid(901),
      bankTransactionId: "26688812003",
      bookedOn: "2027-03-15",
      amountMinor: 450000,
      variableSymbol: "10003",
      counterpartyAccount: "2400112233/2010",
      counterpartyName: "Petra Svobodová",
      message: "Tábor Eliška Svobodová",
      importedAt: "2027-03-16T08:12:00.000Z",
    },
    {
      id: uuid(902),
      bankTransactionId: "26688812002",
      bookedOn: "2027-03-09",
      amountMinor: 200000,
      variableSymbol: null,
      counterpartyAccount: "123456789/0100",
      counterpartyName: "Jan Novák",
      message: "Záloha Jakub",
      importedAt: "2027-03-16T08:12:00.000Z",
    },
    {
      id: uuid(903),
      bankTransactionId: "26688812001",
      bookedOn: "2027-03-02",
      amountMinor: 150050,
      variableSymbol: null,
      counterpartyAccount: null,
      counterpartyName: null,
      message: "Záloha",
      importedAt: "2027-03-16T08:12:00.000Z",
    },
  ],
}).transactions

export const STATEMENT_IMPORTED: StatementImport = statementImportSchema.parse({
  received: 3,
  imported: 2,
  duplicates: 1,
  skippedOutgoing: 1,
  paired: 1,
})

export const EMPTY_STATEMENT: StatementImport = statementImportSchema.parse({
  received: 0,
  imported: 0,
  duplicates: 0,
  skippedOutgoing: 0,
  paired: 0,
})
