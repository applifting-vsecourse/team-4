import { formatCalendarRange } from "@/lib/date"

import { type RoomsOverview } from "@/features/rooms/api/roomSchemas"
import { type TermCapacity } from "@/features/rooms/components/TermCapacityOverview"

/**
 * The rooms of each term for the overview. A room without settings in a term is
 * listed there as unavailable; an unavailable room adds no places.
 */
export function toTermCapacities({ rooms, terms }: RoomsOverview): TermCapacity[] {
  return terms.map((term) => ({
    id: term.id,
    label: term.label,
    dates: formatCalendarRange(term.startDate, term.endDate),
    beds: term.baseBeds,
    extraBeds: term.extraBeds,
    capacity: term.capacity,
    confirmed: term.confirmed,
    rooms: rooms.map((room) => {
      const setting = room.terms.find((roomTerm) => roomTerm.termId === term.id)
      const beds = setting?.baseBeds ?? 0
      const extraBeds = setting?.extraBeds ?? 0
      return {
        id: room.id,
        label: room.label,
        isAvailable: setting?.isAvailable ?? false,
        beds,
        extraBeds,
        total: beds + extraBeds,
      }
    }),
  }))
}
