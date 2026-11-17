import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { bankTransactionsPath, paymentKeys } from "@/features/payments/api/paymentQueryOptions"
import { statementImportSchema } from "@/features/payments/api/paymentSchemas"

/**
 * Uploads a bank statement; the queue is reloaded afterwards. Transactions
 * paired by their variable symbol became payments, so `onPaymentsChanged`
 * lets the page reload what shows them (F24).
 */
export function useStatementImport(
  organizationId: string,
  eventId: string,
  onPaymentsChanged?: () => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.append("file", file)
      return statementImportSchema.parse(
        await api.post(`${bankTransactionsPath(organizationId, eventId)}/import`, { body }).json(),
      )
    },
    onSuccess: async (result) => {
      if (result.paired > 0) onPaymentsChanged?.()
      await queryClient.invalidateQueries({
        queryKey: paymentKeys.transactions(organizationId, eventId),
      })
    },
  })
}
