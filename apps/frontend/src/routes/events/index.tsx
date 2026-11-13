import { useQueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"

import { LoadError } from "@/components/LoadError"
import { PublicShell } from "@/components/PublicShell"
import { Seo } from "@/components/Seo"

import { catalogListQueryOptions } from "@/features/public-events/api/publicEventQueryOptions"
import { EventCatalogList } from "@/features/public-events/components/EventCatalogList"
import { EventCatalogEmpty } from "@/features/public-events/components/EventCatalogStates"
import { toCatalogEventItem } from "@/features/public-events/lib/catalogList"

// Veřejný katalog akcí (F54-2a): published events of all organizations, no
// sign-in. Each card leads to the event detail (F55).
export const Route = createFileRoute("/events/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogListQueryOptions()),
  component: CatalogPage,
  errorComponent: CatalogErrorPage,
})

function CatalogPage() {
  const { data: events } = useSuspenseQuery(catalogListQueryOptions())

  return (
    <PublicShell>
      <Seo title="Katalog akcí" />
      <h1 className="mb-8 text-h2">Katalog akcí</h1>
      {events.length > 0 ? (
        <EventCatalogList events={events.map(toCatalogEventItem)} />
      ) : (
        <EventCatalogEmpty />
      )}
    </PublicShell>
  )
}

// Loading failed (network, server): never shown as an empty catalog.
function CatalogErrorPage() {
  const router = useRouter()
  const { reset } = useQueryErrorResetBoundary()

  return (
    <PublicShell>
      <Seo title="Katalog akcí se nepodařilo načíst" />
      <h1 className="mb-8 text-h2">Katalog akcí</h1>
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
