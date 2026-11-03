import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { qrPaymentPageSchema } from "@/features/registrations/api/qrPaymentSchemas"

export const qrPaymentKeys = {
  page: (token: string) => ["qr-payment", token] as const,
}

// Always fresh: the debt can change between opening the link and paying.
// No automatic retries; "Zkusit znovu" is the visitor's choice.
export const qrPaymentPageQueryOptions = (token: string) =>
  queryOptions({
    queryKey: qrPaymentKeys.page(token),
    queryFn: async () =>
      qrPaymentPageSchema.parse(await api.get(`public/payments/${token}`).json()),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
