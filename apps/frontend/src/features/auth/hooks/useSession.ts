import { useQuery } from "@tanstack/react-query"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"

export function useSession() {
  const { data, isPending, error } = useQuery(authSessionQueryOptions())
  return {
    user: data?.user ?? null,
    isPending,
    error: error ?? null,
  }
}
