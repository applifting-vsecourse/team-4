import { useQueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"

import { LoadError } from "@/components/LoadError"
import { PageHeader } from "@/components/PageHeader"
import { PublicShell } from "@/components/PublicShell"
import { Seo } from "@/components/Seo"

import { catalogListQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import {
  catalogFilterSchema,
  type CatalogFilter,
} from "@/features/public-events/api/publicEventSchemas"
import { EventCatalogFilters } from "@/features/public-events/components/EventCatalogFilters"
import { EventCatalogList } from "@/features/public-events/components/EventCatalogList"
import {
  EventCatalogEmpty,
  EventCatalogNoResults,
} from "@/features/public-events/components/EventCatalogStates"
import { filterCatalog } from "@/features/public-events/lib/catalogFilter"
import { toCatalogEventItem } from "@/features/public-events/lib/catalogList"

// Veřejný katalog akcí (F54-2a): published events of all organizations, no
// sign-in. Each card leads to the event detail (F55). Search and filters
// (F54-2b) are in the URL, so a refresh, a retry and the way back keep them.
export const Route = createFileRoute("/events/")({
  validateSearch: catalogFilterSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogListQueryOptions()),
  component: CatalogPage,
  errorComponent: CatalogErrorPage,
})

function CatalogPage() {
  const filter = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: events } = useSuspenseQuery(catalogListQueryOptions())
  const results = filterCatalog(events, filter)

  // Typing replaces the history entry; a picked date or the switch adds one,
  // so Back returns to the previous selection. The page keeps its scroll.
  const setFilter = (next: CatalogFilter) =>
    void navigate({
      search: next,
      replace: next.q !== filter.q || next.place !== filter.place,
      resetScroll: false,
    })

  return (
    <PublicShell>
      <Seo title="Katalog akcí" />
      <PageHeader title="Katalog akcí" />
      {events.length === 0 ? (
        <EventCatalogEmpty />
      ) : (
        <div className="space-y-8">
          <EventCatalogFilters
            filter={filter}
            onChange={setFilter}
          />
          {results.length > 0 ? (
            <EventCatalogList events={results.map(toCatalogEventItem)} />
          ) : (
            <EventCatalogNoResults onClear={() => setFilter({})} />
          )}
        </div>
      )}
    </PublicShell>
  )
}

// Loading failed (network, server): never shown as an empty catalog. A retry
// reloads the same URL, so the search and filters stay.
function CatalogErrorPage() {
  const router = useRouter()
  const { reset } = useQueryErrorResetBoundary()

  return (
    <PublicShell>
      <Seo title="Katalog akcí se nepodařilo načíst" />
      <PageHeader title="Katalog akcí" />
      <LoadError
        variant="page"
        title="Katalog se nepodařilo načíst"
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </PublicShell>
  )
}
