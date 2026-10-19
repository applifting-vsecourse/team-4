import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"
import { signUpFailure } from "@/features/auth/lib/auth-errors"

export type SignUpInput = {
  name: string
  email: string
  password: string
}

export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      // BetterAuth handles the whole flow and signs the user in by default.
      const { error } = await authClient.signUp.email(input)
      if (error) throw signUpFailure(error)
    },
    onSuccess: () => queryClient.clear(),
  })
}
