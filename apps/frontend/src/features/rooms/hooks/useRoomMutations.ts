import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { roomKeys, roomsPath } from "@/features/rooms/api/roomQueryOptions"
import {
  roomsOverviewSchema,
  type RoomInput,
  type RoomsOverview,
} from "@/features/rooms/api/roomSchemas"

// Every write answers with the overview read back from the database; it
// replaces the cache, so the UI never shows an unsaved change. The capacity of
// the terms on the event page comes from the same rooms; `onChanged` lets the
// page reload it, because one feature does not reach into another's cache.
function useStoreOverview(organizationId: string, eventId: string, onChanged: () => unknown) {
  const queryClient = useQueryClient()
  return async (overview: RoomsOverview) => {
    queryClient.setQueryData(roomKeys.overview(organizationId, eventId), overview)
    await onChanged()
  }
}

/** Adds a room, or edits one when `roomId` is given. */
export function useSaveRoom(organizationId: string, eventId: string, onChanged: () => unknown) {
  const store = useStoreOverview(organizationId, eventId, onChanged)
  return useMutation({
    mutationFn: async ({ roomId, input }: { roomId?: string; input: RoomInput }) => {
      const rooms = roomsPath(organizationId, eventId)
      const request = roomId
        ? api.put(`${rooms}/${roomId}`, { json: input })
        : api.post(rooms, { json: input })
      return roomsOverviewSchema.parse(await request.json())
    },
    onSuccess: store,
  })
}

export function useDeleteRoom(organizationId: string, eventId: string, onChanged: () => unknown) {
  const store = useStoreOverview(organizationId, eventId, onChanged)
  return useMutation({
    mutationFn: async (roomId: string) =>
      roomsOverviewSchema.parse(
        await api.delete(`${roomsPath(organizationId, eventId)}/${roomId}`).json(),
      ),
    onSuccess: store,
  })
}

/** After a refused write show the truth the server holds. */
export function useRefreshRooms(organizationId: string, eventId: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: roomKeys.overview(organizationId, eventId) })
}
