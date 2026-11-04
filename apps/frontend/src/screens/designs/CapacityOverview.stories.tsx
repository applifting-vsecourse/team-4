import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { OrganizerEventPage } from "@/screens/designs/OrganizerEventPage"

import {
  EventCapacityOverview,
  type OverviewTerm,
} from "@/features/accommodation/components/EventCapacityOverview"
import { TermOccupancyTable } from "@/features/accommodation/components/TermOccupancyTable"
import {
  TermCapacityOverview,
  type TermCapacity,
} from "@/features/rooms/components/TermCapacityOverview"

// Design of the capacity of each term (F17-1) in Správa akce → Přehled and
// Ubytování → Obsazenost. The counts of the proposal are the S3-T4 solver's
// (who fits by the rules), never a sum of free beds; rooms and their beds per
// term stay the F11-1 "Pokoje" section, unchanged. Static only: no router,
// queries or API; every value is hard-coded.

const TERMS: OverviewTerm[] = [
  {
    id: "turnus-1",
    label: "1. turnus",
    dates: "4.–11. 7. 2027",
    status: "current",
    evaluatedAt: "dnes 14:32",
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
    evaluatedAt: "dnes 13:05",
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
    id: "turnus-3",
    label: "3. turnus",
    dates: "18.–25. 7. 2027",
    status: "current",
    evaluatedAt: "dnes 9:40",
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

const WITHOUT_REGISTRATIONS: OverviewTerm[] = TERMS.map((term) => ({
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

const WITHOUT_ROOMS: OverviewTerm[] = TERMS.map((term) => ({
  ...term,
  capacity: {
    ...term.capacity,
    hasRooms: false,
    baseBeds: 0,
    extraBeds: 0,
    proposal: term.capacity.proposal
      ? {
          ...term.capacity.proposal,
          suitable: 0,
          unsuitable: term.capacity.pending + term.capacity.waitlisted,
          manual: 0,
          baseUsed: 0,
          extraUsed: 0,
        }
      : undefined,
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

// The F11-1 rooms of each term, as on main.
const ROOMS: TermCapacity[] = TERMS.map((term, index) => ({
  id: term.id,
  label: term.label,
  dates: term.dates,
  beds: term.capacity.baseBeds,
  extraBeds: term.capacity.extraBeds,
  capacity: term.capacity.baseBeds + term.capacity.extraBeds,
  confirmed: term.capacity.confirmed,
  rooms: roomsOf(LAYOUTS[index] ?? []),
}))

function Overview({ children }: { children: ReactNode }) {
  return (
    <OrganizerEventPage
      section="Přehled"
      crumbs={["Přehled"]}
    >
      {children}
    </OrganizerEventPage>
  )
}

function Occupancy({ children }: { children: ReactNode }) {
  return (
    <OrganizerEventPage
      section="Ubytování"
      crumbs={["Ubytování"]}
    >
      {children}
      <TermCapacityOverview
        terms={ROOMS}
        selectedTermId="turnus-1"
      />
    </OrganizerEventPage>
  )
}

const meta = {
  title: "Designs/Accommodation evaluation/F17-1 Term capacity",
  component: Overview,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { children: null },
} satisfies Meta<typeof Overview>

export default meta

type Story = StoryObj<typeof meta>

/** Přehled akce: every term on its own; a stale proposal and a term without available rooms. */
export const EventOverview: Story = { args: { children: <EventCapacityOverview terms={TERMS} /> } }

/** No registrations yet: zeros everywhere, capacity as recorded. */
export const NoRegistrations: Story = {
  args: { children: <EventCapacityOverview terms={WITHOUT_REGISTRATIONS} /> },
}

/** The event has no rooms: capacity is not recorded, nobody fits (reason N). */
export const NoRooms: Story = {
  args: { children: <EventCapacityOverview terms={WITHOUT_ROOMS} /> },
}

/** The overview could not be loaded: an error with a retry, never false zeros. */
export const OverviewLoadFailed: Story = {
  args: {
    children: (
      <EventCapacityOverview
        terms={[]}
        isLoadFailed
      />
    ),
  },
}

/** Ubytování → Obsazenost: the terms with pending and the proposal, and the F11-1 rooms below. */
export const AccommodationOccupancy: Story = {
  render: () => (
    <Occupancy>
      <TermOccupancyTable
        terms={TERMS}
        updatedAt="dnes 14:35"
      />
    </Occupancy>
  ),
}

/** Ubytování → Obsazenost could not be loaded: an error with a retry. */
export const OccupancyLoadFailed: Story = {
  render: () => (
    <Occupancy>
      <TermOccupancyTable
        terms={[]}
        updatedAt="dnes 14:35"
        isLoadFailed
      />
    </Occupancy>
  ),
}
