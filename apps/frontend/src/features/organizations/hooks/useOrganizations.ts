import { useQuery } from "@tanstack/react-query"

import { organizationsQueryOptions } from "@/features/organizations/api/organizationQueryOptions"

export function useOrganizations() {
  const { data, isPending, error } = useQuery(organizationsQueryOptions())
  return { organizations: data ?? [], isPending, error: error ?? null }
}
