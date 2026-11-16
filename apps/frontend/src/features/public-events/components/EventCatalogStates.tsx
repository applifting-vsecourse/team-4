import { Link } from "@tanstack/react-router"
import { CalendarX, SearchX, X } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"

// Veřejný katalog akcí → stavy bez výpisu (F54-2).

/** No event is published at all; different from a filter with no match. */
export function EventCatalogEmpty() {
  return (
    <EmptyState
      icon={CalendarX}
      title="Zatím žádné veřejné akce"
      action={
        <Button asChild>
          <Link to={ROUTES.home}>Zpět na úvodní stránku</Link>
        </Button>
      }
    />
  )
}

/** Events exist, but the search and filters match none of them. */
export function EventCatalogNoResults({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Hledání a filtrům neodpovídá žádná akce"
      action={
        <Button onClick={onClear}>
          <X />
          Zrušit filtry
        </Button>
      }
    />
  )
}
