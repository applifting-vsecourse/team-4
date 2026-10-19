import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"
import { signInFailure } from "@/features/auth/lib/auth-errors"

type SignInInput = {
  email: string
  password: string
  rememberMe?: boolean
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password, rememberMe = false }: SignInInput) => {
      const { error } = await authClient.signIn.email({ email, password, rememberMe })
      if (error) throw signInFailure(error)
    },
    // Drop everything cached for the previous account (organizations included).
    onSuccess: () => queryClient.clear(),
  })
}
