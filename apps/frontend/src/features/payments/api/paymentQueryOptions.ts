import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { bankTransactionsSchema } from "@/features/payments/api/paymentSchemas"

export const paymentKeys = {
  all: () => ["payments"] as const,
  transactions: (organizationId: string, eventId: string) =>
    [...paymentKeys.all(), organizationId, eventId, "transactions"] as const,
}

export const bankTransactionsPath = (organizationId: string, eventId: string) =>
  `organizations/${organizationId}/events/${eventId}/bank-transactions`

export const bankTransactionsQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: paymentKeys.transactions(organizationId, eventId),
    queryFn: async () =>
      bankTransactionsSchema.parse(
        await api.get(bankTransactionsPath(organizationId, eventId)).json(),
      ).transactions,
  })
