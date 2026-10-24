import { useState } from "react"
import { CalendarSearch, SlidersHorizontal, X } from "lucide-react"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"

import { type CatalogEvent } from "@/features/public-events/api/catalogSchemas"
import { CatalogEventCard } from "@/features/public-events/components/CatalogEventCard"
import { CatalogFilters } from "@/features/public-events/components/CatalogFilters"
import {
  activeFilterCount,
  AGE_GROUPS,
  catalogFilterOptions,
  filterCatalog,
  formatEventCount,
  formatMonth,
  type CatalogFilter,
} from "@/features/public-events/lib/catalogFilter"

type PublicCatalogPageProps = {
  /** Published events; undefined while loading. */
  events?: CatalogEvent[]
  isLoading?: boolean
  defaultFilter?: CatalogFilter
}

// Public catalog of published events (F54-2, #64), mock UI. Filters apply at
// once: inline on wider screens, in a bottom sheet on a phone. Active filters
// show as removable chips.
export function PublicCatalogPage({
  events,
  isLoading = false,
  defaultFilter = {},
}: PublicCatalogPageProps) {
  const [filter, setFilter] = useState<CatalogFilter>(defaultFilter)

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <HeaderLogo />
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:py-12">
        <h1 className="text-h2 md:text-h1">Katalog akcí</h1>

        {isLoading || !events ? (
          <CatalogSkeleton />
        ) : events.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarSearch />
              </EmptyMedia>
              <EmptyTitle>Zatím tu nejsou žádné zveřejněné akce.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <CatalogResults
            events={events}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}
      </main>
    </div>
  )
}

type CatalogResultsProps = {
  events: CatalogEvent[]
  filter: CatalogFilter
  onFilterChange: (filter: CatalogFilter) => void
}

function CatalogResults({ events, filter, onFilterChange }: CatalogResultsProps) {
  const options = catalogFilterOptions(events)
  const results = filterCatalog(events, filter)
  const activeCount = activeFilterCount(filter)
  const clear = () => onFilterChange({})

  return (
    <>
      <div className="hidden md:block">
        <CatalogFilters
          filter={filter}
          options={options}
          onChange={onFilterChange}
        />
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
            >
              <SlidersHorizontal />
              Filtry
              {activeCount > 0 ? <Badge>{activeCount}</Badge> : null}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            aria-describedby={undefined}
          >
            <SheetHeader>
              <SheetTitle>Filtry</SheetTitle>
            </SheetHeader>
            <div className="px-4">
              <CatalogFilters
                filter={filter}
                options={options}
                onChange={onFilterChange}
              />
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button size="lg">Zobrazit {formatEventCount(results.length)}</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {activeCount > 0 ? (
        <ActiveFilters
          filter={filter}
          onFilterChange={onFilterChange}
        />
      ) : null}

      <p
        role="status"
        className="text-sm text-muted-foreground"
      >
        {formatEventCount(results.length)}
      </p>

      {results.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarSearch />
            </EmptyMedia>
            <EmptyTitle>Filtrům neodpovídá žádná akce.</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={clear}>
              <X />
              Vymazat filtry
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((event) => (
            <li key={event.publicId}>
              <CatalogEventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ActiveFilters({
  filter,
  onFilterChange,
}: {
  filter: CatalogFilter
  onFilterChange: (filter: CatalogFilter) => void
}) {
  const chips = [
    filter.month && { key: "month" as const, label: formatMonth(filter.month) },
    filter.region && { key: "region" as const, label: filter.region },
    filter.ageGroup && {
      key: "ageGroup" as const,
      label: AGE_GROUPS.find((group) => group.id === filter.ageGroup)?.label ?? filter.ageGroup,
    },
  ].filter((chip) => chip !== undefined && chip !== "")

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Button
          key={chip.key}
          variant="secondary"
          size="sm"
          aria-label={`Zrušit filtr ${chip.label}`}
          onClick={() => onFilterChange({ ...filter, [chip.key]: undefined })}
        >
          {chip.label}
          <X />
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFilterChange({})}
      >
        Vymazat vše
      </Button>
    </div>
  )
}

function CatalogSkeleton() {
  return (
    <div
      role="status"
      aria-label="Načítání akcí"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((index) => (
        <Skeleton
          key={index}
          className="h-72 w-full"
        />
      ))}
    </div>
  )
}
