import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  bankTransactionsSchema,
  registrationOptionsSchema,
} from "@/features/payments/api/paymentSchemas"

export const paymentKeys = {
  all: () => ["payments"] as const,
  transactions: (organizationId: string, eventId: string) =>
    [...paymentKeys.all(), organizationId, eventId, "transactions"] as const,
  registrationOptions: (organizationId: string, eventId: string) =>
    [...paymentKeys.all(), organizationId, eventId, "registration-options"] as const,
}

export const bankTransactionsPath = (organizationId: string, eventId: string) =>
  `organizations/${organizationId}/events/${eventId}/bank-transactions`

/** The event's unpaired transactions, newest first (F24). */
export const bankTransactionsQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: paymentKeys.transactions(organizationId, eventId),
    queryFn: async () =>
      bankTransactionsSchema.parse(
        await api.get(bankTransactionsPath(organizationId, eventId)).json(),
      ).transactions,
  })

/** Registrations of the event a transaction can be paired with, by surname. */
export const registrationOptionsQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: paymentKeys.registrationOptions(organizationId, eventId),
    queryFn: async () => {
      const { registrations } = registrationOptionsSchema.parse(
        await api.get(`organizations/${organizationId}/events/${eventId}/registrations`).json(),
      )
      return [...registrations].sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName, "cs") ||
          a.firstName.localeCompare(b.firstName, "cs"),
      )
    },
  })
