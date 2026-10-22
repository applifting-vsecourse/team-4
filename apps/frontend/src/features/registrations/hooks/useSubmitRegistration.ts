import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  registrationResultSchema,
  type RegistrationInput,
} from "@/features/registrations/api/registrationSchemas"

/**
 * 201 for a new registration and 200 for a repeat of one already saved; both
 * carry the stored result, which is the only thing shown as success.
 */
export function useSubmitRegistration(publicId: string) {
  return useMutation({
    mutationFn: async (input: RegistrationInput) =>
      registrationResultSchema.parse(
        await api
          .post(`public/events/${encodeURIComponent(publicId)}/registrations`, { json: input })
          .json(),
      ),
  })
}
