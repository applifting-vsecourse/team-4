import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { organizationKeys } from "@/features/organizations/api/organizationQueryOptions"
import { organizationSchema } from "@/features/organizations/api/organizationSchemas"

export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string }) =>
      organizationSchema.parse(await api.post("organizations", { json: input }).json()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.list() })
    },
  })
}
