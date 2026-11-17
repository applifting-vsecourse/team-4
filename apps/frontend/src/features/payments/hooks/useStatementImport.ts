import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { bankTransactionsPath, paymentKeys } from "@/features/payments/api/paymentQueryOptions"
import { statementImportSchema } from "@/features/payments/api/paymentSchemas"

/** Uploads a bank statement; the transaction list is reloaded afterwards. */
export function useStatementImport(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.append("file", file)
      return statementImportSchema.parse(
        await api.post(`${bankTransactionsPath(organizationId, eventId)}/import`, { body }).json(),
      )
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: paymentKeys.transactions(organizationId, eventId),
      }),
  })
}
