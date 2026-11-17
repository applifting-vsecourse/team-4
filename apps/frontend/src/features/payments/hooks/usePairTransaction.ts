import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { bankTransactionsPath, paymentKeys } from "@/features/payments/api/paymentQueryOptions"
import type { ManualPairing } from "@/features/payments/api/paymentSchemas"

/**
 * Pairs a queued transaction with a registration by hand (F24). The queue is
 * reloaded afterwards, also after a refusal, which may mean that the
 * transaction was paired meanwhile. The reload is not awaited, so the caller
 * handles the answer before the row can leave the queue.
 */
export function usePairTransaction(organizationId: string, eventId: string, transactionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pairing: ManualPairing) => {
      await api.post(`${bankTransactionsPath(organizationId, eventId)}/${transactionId}/pairing`, {
        json: pairing,
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: paymentKeys.transactions(organizationId, eventId),
      })
    },
  })
}
