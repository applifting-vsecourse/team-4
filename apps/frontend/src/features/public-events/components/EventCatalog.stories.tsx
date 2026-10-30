import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Header } from "@/components/Header/Header"
import { Button } from "@/components/ui/button"

import {
  ALL_OPTIONS,
  EventCatalogFilters,
  type CatalogFilterOption,
  type CatalogFilterValues,
} from "@/features/public-events/components/EventCatalogFilters"
import {
  EventCatalogList,
  type CatalogEventItem,
} from "@/features/public-events/components/EventCatalogList"
import {
  EventCatalogEmpty,
  EventCatalogError,
  EventCatalogNoResults,
} from "@/features/public-events/components/EventCatalogStates"

// F54-2 design preview: public event catalog with filters by term, place and
// age group. Static only: no router logic, queries or API; every value is hard-coded.

const PLACES: CatalogFilterOption[] = [
  { value: "hlinsko", label: "Hlinsko" },
  { value: "praha", label: "Praha" },
  { value: "brno", label: "Brno" },
]

const AGE_GROUPS: CatalogFilterOption[] = [
  { value: "6-10", label: "6–10 let" },
  { value: "11-15", label: "11–15 let" },
  { value: "16-plus", label: "16+ let" },
]

const NO_FILTERS: CatalogFilterValues = {
  dateFrom: "",
  dateTo: "",
  place: ALL_OPTIONS,
  ageGroup: ALL_OPTIONS,
}

const EVENTS: CatalogEventItem[] = [
  {
    publicId: "letni-tabor-2027",
    name: "Letní tábor Modrá Hora 2027",
    organizationName: "Spolek Modrá Hora",
    location: "Tábořiště Modrá Hora, Hlinsko",
    terms: ["Turnus 1: 4.–17. 7. 2027", "Turnus 2: 1.–14. 8. 2027"],
    ageGroup: "11–15 let",
  },
  {
    publicId: "mesto-hrou-2027",
    name: "Příměstský tábor Město hrou",
    organizationName: "Dům dětí a mládeže Praha 4",
    location: "DDM Praha 4, Praha",
    terms: ["19.–23. 7. 2027", "9.–13. 8. 2027"],
    ageGroup: "6–10 let",
  },
  {
    publicId: "podzimni-vikend-2027",
    name: "Podzimní víkend pro mladé organizátory",
    organizationName: "Junák Brno",
    location: "Skautská základna Kameňák, Brno",
    terms: ["15.–17. 10. 2027"],
    ageGroup: "16+ let",
  },
]

const FILTERED: CatalogEventItem[] = EVENTS.filter((event) => event.publicId === "mesto-hrou-2027")

function CatalogPage({ children, filters }: { children: ReactNode; filters: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header userMenu={<Button size="sm">Přihlásit se</Button>} />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-h2">Katalog akcí</h1>
        <div className="mt-6">{filters}</div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  )
}

function Filters({
  values = NO_FILTERS,
  hasActiveFilters = false,
}: {
  values?: CatalogFilterValues
  hasActiveFilters?: boolean
}) {
  return (
    <EventCatalogFilters
      values={values}
      placeOptions={PLACES}
      ageGroupOptions={AGE_GROUPS}
      hasActiveFilters={hasActiveFilters}
      onChange={fn()}
      onClear={fn()}
    />
  )
}

const meta = {
  title: "Designs/F54-2 Public event catalog",
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "desktop" } },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

/** Whole public catalog, no filter set. */
export const AllEvents: Story = {
  render: () => (
    <CatalogPage filters={<Filters />}>
      <EventCatalogList events={EVENTS} />
    </CatalogPage>
  ),
}

/** Place and age group set: only matching events, with the option to clear. */
export const FilteredEvents: Story = {
  render: () => (
    <CatalogPage
      filters={
        <Filters
          values={{ ...NO_FILTERS, place: "praha", ageGroup: "6-10" }}
          hasActiveFilters
        />
      }
    >
      <EventCatalogList events={FILTERED} />
    </CatalogPage>
  ),
}

/** Filters set (term range included) that match nothing. */
export const NoResults: Story = {
  render: () => (
    <CatalogPage
      filters={
        <Filters
          values={{
            dateFrom: "2027-09-01",
            dateTo: "2027-09-30",
            place: "hlinsko",
            ageGroup: "16-plus",
          }}
          hasActiveFilters
        />
      }
    >
      <EventCatalogNoResults onClear={fn()} />
    </CatalogPage>
  ),
}

/** No event is published; the filters have nothing to filter. */
export const NoPublishedEvents: Story = {
  render: () => (
    <CatalogPage filters={null}>
      <EventCatalogEmpty />
    </CatalogPage>
  ),
}

/** Loading failed: an error with retry, not an empty catalog. */
export const LoadError: Story = {
  render: () => (
    <CatalogPage filters={null}>
      <EventCatalogError onRetry={fn()} />
    </CatalogPage>
  ),
}
