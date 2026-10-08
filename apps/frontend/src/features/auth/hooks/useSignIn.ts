import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"

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
      if (error) throw new Error(error.message ?? "Sign in failed")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}
