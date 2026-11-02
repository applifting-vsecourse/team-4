import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { qrPaymentKeys } from "@/features/registrations/api/qrPaymentQueryOptions"
import { qrPaymentResultSchema } from "@/features/registrations/api/qrPaymentSchemas"

export type QrPaymentInput = {
  /** One per attempt at the same amount; a retry sends the same key. */
  submissionKey: string
  amountMinor: number
}

/** Pays all or part of the debt; the page is reloaded afterwards, so it never shows a stale debt. */
export function useQrPayment(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: QrPaymentInput) =>
      qrPaymentResultSchema.parse(
        await api.post(`public/payments/${token}`, { json: input }).json(),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qrPaymentKeys.page(token) }),
  })
}
