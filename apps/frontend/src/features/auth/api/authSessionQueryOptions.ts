import { queryOptions } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"

export type SessionUser = {
  id: string
  email: string
  name: string
  username: string
  role?: string
}

export type Session = {
  user: SessionUser
} | null

export const authSessionQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<Session> => {
      const { data, error } = await authClient.getSession()
      if (error) throw new Error(error.message ?? "Failed to load session")
      if (!data?.user) return null

      const user = data.user as typeof data.user & {
        username?: string | null
        role?: string | null
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username ?? "",
          role: user.role ?? undefined,
        },
      }
    },
    staleTime: 30_000,
  })
