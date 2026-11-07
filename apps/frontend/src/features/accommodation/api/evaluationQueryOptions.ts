import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import {
  evaluationModeResponseSchema,
  moveRecordSchema,
  registrationAccommodationSchema,
  runEvidenceSchema,
  runListSchema,
  termEvaluationSchema,
} from "@/features/accommodation/api/evaluationSchemas"

// Everything under `event(...)` belongs to one event's evaluation. A
// recalculation or a new mode invalidates it.
export const evaluationKeys = {
  event: (organizationId: string, eventId: string) =>
    ["accommodation", organizationId, eventId] as const,
  mode: (organizationId: string, eventId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "mode"] as const,
  term: (organizationId: string, eventId: string, termId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "term", termId] as const,
  runs: (organizationId: string, eventId: string, termId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "runs", termId] as const,
  moves: (organizationId: string, eventId: string, termId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "moves", termId] as const,
  run: (organizationId: string, eventId: string, runId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "run", runId] as const,
  registration: (organizationId: string, eventId: string, registrationId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "registration", registrationId] as const,
}

export const accommodationPath = (organizationId: string, eventId: string) =>
  `organizations/${organizationId}/events/${eventId}/accommodation`

/** While a run is in progress or scheduled, the term is read again until it settles. */
const POLL_MS = 1500

export const evaluationModeQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: evaluationKeys.mode(organizationId, eventId),
    queryFn: async () =>
      evaluationModeResponseSchema.parse(
        await api.get(`${accommodationPath(organizationId, eventId)}/evaluation-mode`).json(),
      ).mode,
  })

export const termEvaluationQueryOptions = (
  organizationId: string,
  eventId: string,
  termId: string,
) =>
  queryOptions({
    queryKey: evaluationKeys.term(organizationId, eventId, termId),
    queryFn: async () =>
      termEvaluationSchema.parse(
        await api
          .get(`${accommodationPath(organizationId, eventId)}/terms/${termId}/evaluation`)
          .json(),
      ),
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.status === "running") return POLL_MS
      // A scheduled run is waited for, not one overdue by a minute (no worker).
      const scheduled = data?.scheduledAt ? Date.parse(data.scheduledAt) : null
      return scheduled !== null && scheduled > Date.now() - 60_000 ? POLL_MS : false
    },
  })

export const termRunsQueryOptions = (organizationId: string, eventId: string, termId: string) =>
  queryOptions({
    queryKey: evaluationKeys.runs(organizationId, eventId, termId),
    queryFn: async () =>
      runListSchema.parse(
        await api.get(`${accommodationPath(organizationId, eventId)}/terms/${termId}/runs`).json(),
      ).runs,
  })

/** The manual changes of the term's order (F39-1), newest first. */
export const termMovesQueryOptions = (organizationId: string, eventId: string, termId: string) =>
  queryOptions({
    queryKey: evaluationKeys.moves(organizationId, eventId, termId),
    queryFn: async () =>
      z
        .array(moveRecordSchema)
        .parse(
          await api
            .get(`${accommodationPath(organizationId, eventId)}/terms/${termId}/order/moves`)
            .json(),
        ),
  })

export const runEvidenceQueryOptions = (organizationId: string, eventId: string, runId: string) =>
  queryOptions({
    queryKey: evaluationKeys.run(organizationId, eventId, runId),
    queryFn: async () =>
      runEvidenceSchema.parse(
        await api.get(`${accommodationPath(organizationId, eventId)}/runs/${runId}`).json(),
      ),
  })

/** The answer, the determination and its history of one registration. */
export const registrationAccommodationQueryOptions = (
  organizationId: string,
  eventId: string,
  registrationId: string,
) =>
  queryOptions({
    queryKey: evaluationKeys.registration(organizationId, eventId, registrationId),
    queryFn: async () =>
      registrationAccommodationSchema.parse(
        await api
          .get(
            `organizations/${organizationId}/events/${eventId}/registrations/${registrationId}/accommodation`,
          )
          .json(),
      ),
  })
