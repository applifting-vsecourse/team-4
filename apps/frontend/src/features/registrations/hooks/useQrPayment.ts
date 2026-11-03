import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api, HTTPError } from "@/lib/api-client"

import { qrPaymentKeys } from "@/features/registrations/api/qrPaymentQueryOptions"
import {
  qrPaymentResultSchema,
  type QrPaymentPage,
} from "@/features/registrations/api/qrPaymentSchemas"

export type QrPaymentInput = {
  /** One per attempt at the same amount; a retry sends the same key. */
  submissionKey: string
  amountMinor: number
}

// A refused amount (409) carries the debt as the server has it now.
const currentBalance = (error: unknown): number | null => {
  if (!(error instanceof HTTPError)) return null
  const data: unknown = error.data
  const balance =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>).balanceMinor
      : null
  return typeof balance === "number" ? balance : null
}

/**
 * Pays all or part of the debt. Afterwards the page is reloaded, and a refused
 * amount puts the server's current debt on the page at once, so the form
 * never keeps the old one even when that reload fails.
 */
export function useQrPayment(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: QrPaymentInput) =>
      qrPaymentResultSchema.parse(
        await api.post(`public/payments/${token}`, { json: input }).json(),
      ),
    onError: (error) => {
      const balanceMinor = currentBalance(error)
      if (balanceMinor === null) return
      queryClient.setQueryData(qrPaymentKeys.page(token), (page: QrPaymentPage | undefined) =>
        page ? { ...page, balanceMinor } : page,
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qrPaymentKeys.page(token) }),
  })
}
