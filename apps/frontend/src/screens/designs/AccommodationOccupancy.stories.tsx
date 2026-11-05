import type { Meta, StoryObj } from "@storybook/react-vite"

import { OrganizerEventPage } from "@/screens/designs/OrganizerEventPage"

import {
  TermOccupancyTable,
  type OccupancyTerm,
} from "@/features/accommodation/components/TermOccupancyTable"
import {
  TermCapacityOverview,
  type TermCapacity,
} from "@/features/rooms/components/TermCapacityOverview"

// Design of the capacity of each term (F17-1) in Správa akce → Ubytování →
// Obsazenost. Přehled akce stays as on main; the capacity of the selected term
// is also part of the term evaluation. The counts of the proposal are the
// S3-T4 solver's (who fits by the rules), never a sum of free beds; rooms and
// their beds per term stay the F11-1 "Pokoje" section, unchanged. Static
// only: no router, queries or API; every value is hard-coded.

const TERMS: OccupancyTerm[] = [
  {
    id: "turnus-1",
    label: "1. turnus",
    dates: "4.–11. 7. 2027",
    status: "current",
    capacity: {
      confirmed: 9,
      pending: 14,
      waitlisted: 4,
      hasRooms: true,
      baseBeds: 20,
      extraBeds: 2,
      proposal: { suitable: 13, unsuitable: 3, manual: 2, baseUsed: 20, extraUsed: 2 },
    },
  },
  {
    // An extra bed was added after the run: the proposal is stale until recalculated.
    id: "turnus-2",
    label: "2. turnus",
    dates: "11.–18. 7. 2027",
    status: "stale",
    capacity: {
      confirmed: 12,
      pending: 6,
      waitlisted: 0,
      hasRooms: true,
      baseBeds: 16,
      extraBeds: 3,
      proposal: { suitable: 4, unsuitable: 1, manual: 1, baseUsed: 16, extraUsed: 0 },
    },
  },
  {
    // No room is available in this term: capacity 0, everyone reason N.
    id: "turnus-3",
    label: "3. turnus",
    dates: "18.–25. 7. 2027",
    status: "current",
    capacity: {
      confirmed: 0,
      pending: 2,
      waitlisted: 0,
      hasRooms: true,
      baseBeds: 0,
      extraBeds: 0,
      proposal: { suitable: 0, unsuitable: 2, manual: 0, baseUsed: 0, extraUsed: 0 },
    },
  },
]

const WITHOUT_REGISTRATIONS: OccupancyTerm[] = TERMS.map((term) => ({
  ...term,
  status: "current",
  capacity: {
    ...term.capacity,
    confirmed: 0,
    pending: 0,
    waitlisted: 0,
    proposal: { suitable: 0, unsuitable: 0, manual: 0, baseUsed: 0, extraUsed: 0 },
  },
}))

const WITHOUT_ROOMS: OccupancyTerm[] = TERMS.map((term) => ({
  ...term,
  status: "current",
  capacity: {
    ...term.capacity,
    hasRooms: false,
    baseBeds: 0,
    extraBeds: 0,
    proposal: {
      suitable: 0,
      unsuitable: term.capacity.pending + term.capacity.waitlisted,
      manual: 0,
      baseUsed: 0,
      extraUsed: 0,
    },
  },
}))

const ROOM_LABELS = [
  "Chata Javor",
  "Chata Buk",
  "Chata Dub",
  "Chata Lípa",
  "Pokoj u kuchyně",
  "Pokoj u klubovny",
]

/** The rooms of one term: [beds, extra beds] per room, null when unavailable. */
function roomsOf(beds: ([number, number] | null)[]): TermCapacity["rooms"] {
  return ROOM_LABELS.map((label, index) => {
    const room = beds[index] ?? null
    return {
      id: `r-${index + 1}`,
      label,
      isAvailable: room !== null,
      beds: room?.[0] ?? 0,
      extraBeds: room?.[1] ?? 0,
      total: room ? room[0] + room[1] : 0,
    }
  })
}

const LAYOUTS: ([number, number] | null)[][] = [
  [
    [4, 1],
    [4, 1],
    [4, 0],
    [4, 0],
    [2, 0],
    [2, 0],
  ],
  [[4, 1], [4, 1], [4, 1], null, [2, 0], [2, 0]],
  [null, null, null, null, null, null],
]

/** The F11-1 rooms of each term, as on main; without rooms every term has none. */
function roomsByTerm(terms: OccupancyTerm[], hasRooms = true): TermCapacity[] {
  return terms.map((term, index) => ({
    id: term.id,
    label: term.label,
    dates: term.dates,
    beds: term.capacity.baseBeds,
    extraBeds: term.capacity.extraBeds,
    capacity: term.capacity.baseBeds + term.capacity.extraBeds,
    confirmed: term.capacity.confirmed,
    rooms: hasRooms ? roomsOf(LAYOUTS[index] ?? []) : [],
  }))
}

type OccupancyProps = {
  terms: OccupancyTerm[]
  rooms: TermCapacity[]
  isLoadFailed?: boolean
}

function Occupancy({ terms, rooms, isLoadFailed = false }: OccupancyProps) {
  return (
    <OrganizerEventPage
      section="Ubytování"
      crumbs={["Ubytování"]}
    >
      <TermOccupancyTable
        terms={terms}
        updatedAt="dnes 14:35"
        isLoadFailed={isLoadFailed}
      />
      <TermCapacityOverview
        terms={rooms}
        selectedTermId="turnus-1"
      />
    </OrganizerEventPage>
  )
}

const meta = {
  title: "Designs/Accommodation evaluation/F17-1 Accommodation occupancy",
  component: Occupancy,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { terms: TERMS, rooms: roomsByTerm(TERMS) },
} satisfies Meta<typeof Occupancy>

export default meta

type Story = StoryObj<typeof meta>

/** Each term on its own row: pending added, the proposal's count and status; a stale term and one without available rooms. */
export const AccommodationOccupancy: Story = {}

/** No registrations yet: zeros everywhere, capacity as recorded. */
export const NoRegistrations: Story = {
  args: { terms: WITHOUT_REGISTRATIONS, rooms: roomsByTerm(WITHOUT_REGISTRATIONS) },
}

/** The event has no rooms: capacity is not recorded, nobody fits (reason N). */
export const NoRooms: Story = {
  args: { terms: WITHOUT_ROOMS, rooms: roomsByTerm(WITHOUT_ROOMS, false) },
}

/** The occupancy could not be loaded: an error with a retry, never false zeros. */
export const LoadFailed: Story = { args: { terms: [], isLoadFailed: true } }
