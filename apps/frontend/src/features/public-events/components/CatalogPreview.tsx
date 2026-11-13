import { CalendarX } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { EventCatalogCard } from "@/features/public-events/components/EventCatalogList"
import { useCatalogPreview } from "@/features/public-events/hooks/useCatalogPreview"
import { CATALOG_PREVIEW_SIZE } from "@/features/public-events/lib/catalogList"

// Úvod → sekce Katalog akcí: the soonest published events (F54-2a, F58). The
// section around it, with its way into the whole catalog, renders in every
// state, so an empty or failing catalog never blocks the landing page.
export function CatalogPreview() {
  const { data: events, isPending, isError, isFetching, refetch } = useCatalogPreview()

  if (isPending) {
    return (
      <LoadingBlock label="Načítání akcí">
        <ul
          aria-hidden
          className="grid gap-6 md:grid-cols-3"
        >
          {Array.from({ length: CATALOG_PREVIEW_SIZE }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-80" />
            </li>
          ))}
        </ul>
      </LoadingBlock>
    )
  }

  if (isError) {
    return (
      <LoadError
        title="Akce se nepodařilo načíst"
        isRetrying={isFetching}
        onRetry={() => refetch()}
      />
    )
  }

  if (events.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX />
          </EmptyMedia>
          <EmptyTitle>Zatím žádné veřejné akce</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  // Cards keep one column's width whatever their count; the middle card of a
  // full row is shifted down, the "Ticket stub" stagger.
  return (
    <ul className="grid gap-6 md:grid-cols-3">
      {events.map((event, index) => (
        <li
          key={event.publicId}
          className={cn(
            "flex",
            events.length === CATALOG_PREVIEW_SIZE && index === 1 && "md:translate-y-10",
          )}
        >
          <EventCatalogCard
            event={event}
            headingLevel="h3"
          />
        </li>
      ))}
    </ul>
  )
}
