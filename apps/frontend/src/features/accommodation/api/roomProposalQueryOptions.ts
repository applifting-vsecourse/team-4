import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  accommodationPath,
  evaluationKeys,
} from "@/features/accommodation/api/evaluationQueryOptions"
import {
  roomProposalModeResponseSchema,
  roomProposalPreferencesSchema,
  termRoomProposalSchema,
} from "@/features/accommodation/api/roomProposalSchemas"

// Under the event's accommodation keys, so a change that invalidates the
// evaluation of an event reloads its room proposals too.
export const roomProposalKeys = {
  mode: (organizationId: string, eventId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "room-proposal-mode"] as const,
  preferences: (organizationId: string, eventId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "room-proposal-preferences"] as const,
  term: (organizationId: string, eventId: string, termId: string) =>
    [...evaluationKeys.event(organizationId, eventId), "room-proposal", termId] as const,
}

/** While a proposal runs or is scheduled, the term is read again until it settles. */
const POLL_MS = 1500

export const roomProposalModeQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: roomProposalKeys.mode(organizationId, eventId),
    queryFn: async () =>
      roomProposalModeResponseSchema.parse(
        await api.get(`${accommodationPath(organizationId, eventId)}/room-proposal-mode`).json(),
      ).mode,
  })

/** The ranked soft preferences (#389); reloaded when the hard attribute changes. */
export const roomProposalPreferencesQueryOptions = (organizationId: string, eventId: string) =>
  queryOptions({
    queryKey: roomProposalKeys.preferences(organizationId, eventId),
    queryFn: async () =>
      roomProposalPreferencesSchema.parse(
        await api
          .get(`${accommodationPath(organizationId, eventId)}/room-proposal-preferences`)
          .json(),
      ),
  })

export const termRoomProposalQueryOptions = (
  organizationId: string,
  eventId: string,
  termId: string,
) =>
  queryOptions({
    queryKey: roomProposalKeys.term(organizationId, eventId, termId),
    queryFn: async () =>
      termRoomProposalSchema.parse(
        await api
          .get(`${accommodationPath(organizationId, eventId)}/terms/${termId}/room-proposal`)
          .json(),
      ),
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.status === "running") return POLL_MS
      // A scheduled proposal is waited for, not one overdue by a minute (no worker).
      const scheduled = data?.scheduledAt ? Date.parse(data.scheduledAt) : null
      return scheduled !== null && scheduled > Date.now() - 60_000 ? POLL_MS : false
    },
  })
