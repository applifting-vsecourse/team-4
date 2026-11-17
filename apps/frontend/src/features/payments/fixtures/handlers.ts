import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import type { BankTransaction } from "@/features/payments/api/paymentSchemas"
import { BANK_TRANSACTIONS, STATEMENT_IMPORTED } from "@/features/payments/fixtures/payments"

// MSW handlers for Správa akce → Platby. Install with `msw.use(...)` in a
// story's `beforeEach`.

const TRANSACTIONS = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/bank-transactions`

export const paymentHandlers = {
  transactions: (transactions: BankTransaction[] = BANK_TRANSACTIONS) => [
    http.get(TRANSACTIONS, () => HttpResponse.json({ transactions })),
  ],
  import: (result = STATEMENT_IMPORTED) => [
    http.post(`${TRANSACTIONS}/import`, () => HttpResponse.json(result)),
  ],
}
