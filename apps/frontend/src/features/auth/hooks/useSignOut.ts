import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"

export function useSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authClient.signOut().then(() => undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
      await navigate({ to: "/login" })
    },
  })
}
