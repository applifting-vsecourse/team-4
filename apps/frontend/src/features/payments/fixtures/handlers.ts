import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import type { BankTransaction } from "@/features/payments/api/paymentSchemas"
import { BANK_TRANSACTIONS, STATEMENT_IMPORTED } from "@/features/payments/fixtures/payments"

// MSW handlers for Správa akce → Platby. Install with `msw.use(...)` in a
// story's `beforeEach`. The pairing dialog reads the event's registrations
// from the registrations handlers.

const TRANSACTIONS = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/bank-transactions`

export const paymentHandlers = {
  transactions: (transactions: BankTransaction[] = BANK_TRANSACTIONS) => [
    http.get(TRANSACTIONS, () => HttpResponse.json({ transactions })),
  ],
  import: (result = STATEMENT_IMPORTED) => [
    http.post(`${TRANSACTIONS}/import`, () => HttpResponse.json(result)),
  ],
  /** A pairing is accepted; the queue then answers without the transaction. */
  pairing: (transactions: BankTransaction[] = BANK_TRANSACTIONS) => {
    let queue = transactions
    return [
      http.get(TRANSACTIONS, () => HttpResponse.json({ transactions: queue })),
      http.post(`${TRANSACTIONS}/:transactionId/pairing`, ({ params }) => {
        queue = queue.filter((transaction) => transaction.id !== params.transactionId)
        return new HttpResponse(null, { status: 204 })
      }),
    ]
  },
}
