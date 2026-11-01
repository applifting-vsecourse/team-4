import { Link } from "@tanstack/react-router"
import { CalendarX, SearchX, TriangleAlert } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

// Veřejný katalog akcí → stavy bez výpisu (F54-2). Design only.

/** No event is published at all; different from a filter with no match. */
export function EventCatalogEmpty() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarX />
        </EmptyMedia>
        <EmptyTitle>Zatím žádné veřejné akce</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to={ROUTES.home}>Zpět na úvodní stránku</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** Events exist, but the active filters match none of them. */
export function EventCatalogNoResults({ onClear }: { onClear: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>Filtrům neodpovídá žádná akce</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onClear}>Vymazat filtry</Button>
      </EmptyContent>
    </Empty>
  )
}

/** The catalog could not be loaded; never shown as an empty catalog. */
export function EventCatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>Katalog se nepodařilo načíst</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          onClick={onRetry}
        >
          Zkusit znovu
        </Button>
      </EmptyContent>
    </Empty>
  )
}
