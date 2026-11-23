import { useQuery } from "@tanstack/react-query"

import { hardAttributeQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { attributeLabels, type AttributeLabels } from "@/features/accommodation/lib/evaluationView"

/**
 * The labels of the event's categorical questions and answers (#485): gender
 * at once, a question once Pravidla ubytování (cached) are read.
 */
export function useAttributeLabels(organizationId: string, eventId: string): AttributeLabels {
  const { data } = useQuery(hardAttributeQueryOptions(organizationId, eventId))
  return attributeLabels(data?.options)
}
