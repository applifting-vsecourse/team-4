import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  organizationSchema,
  organizationsSchema,
} from "@/features/organizations/api/organizationSchemas"

export const organizationKeys = {
  all: () => ["organizations"] as const,
  list: () => [...organizationKeys.all(), "list"] as const,
  detail: (organizationId: string) =>
    [...organizationKeys.all(), "detail", organizationId] as const,
}

export const organizationsQueryOptions = () =>
  queryOptions({
    queryKey: organizationKeys.list(),
    queryFn: async () => organizationsSchema.parse(await api.get("organizations").json()),
  })

export const organizationQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: async () =>
      organizationSchema.parse(await api.get(`organizations/${organizationId}`).json()),
  })
