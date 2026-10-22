import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { magicLinkRequestedSchema } from "@/features/participant-access/api/participantSchemas"

/** The answer is the same for every e-mail, so success says nothing about the e-mail. */
export function useRequestMagicLink() {
  return useMutation({
    mutationFn: async (email: string) =>
      magicLinkRequestedSchema.parse(
        await api.post("participant/magic-links", { json: { email } }).json(),
      ),
  })
}
