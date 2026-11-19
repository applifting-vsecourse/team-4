import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  accommodationPath,
  evaluationKeys,
} from "@/features/accommodation/api/evaluationQueryOptions"
import { hardAttributeSettingSchema } from "@/features/accommodation/api/evaluationSchemas"

/**
 * Nastavení → Pravidla ubytování (#384): a new hard attribute makes every
 * term's evaluation stale; it confirms, cancels and moves nobody.
 */
export function useSaveHardAttribute(
  organizationId: string,
  eventId: string,
  /** Also reloaded on success, e.g. the registrations of another feature. */
  invalidate: readonly unknown[] = [],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (hardAttribute: string | null) =>
      hardAttributeSettingSchema.parse(
        await api
          .put(`${accommodationPath(organizationId, eventId)}/hard-attribute`, {
            json: { hardAttribute },
          })
          .json(),
      ),
    // A lost response may still have saved: the shown rule is read again.
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: evaluationKeys.hardAttribute(organizationId, eventId),
      }),
    onSuccess: async (setting) => {
      queryClient.setQueryData(evaluationKeys.hardAttribute(organizationId, eventId), setting)
      const saved = evaluationKeys.hardAttribute(organizationId, eventId)
      // The evaluation, its queues and who needs a determination follow the
      // rule; the rule itself is the saved answer.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: evaluationKeys.event(organizationId, eventId),
          predicate: (query) => query.queryKey[saved.length - 1] !== saved[saved.length - 1],
        }),
        ...(invalidate.length ? [queryClient.invalidateQueries({ queryKey: invalidate })] : []),
      ])
    },
  })
}
