import { Link } from "@tanstack/react-router"
import { CalendarCog, Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

// An organization without events.
export function EventsEmptyState({ organizationId }: { organizationId: string }) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarCog />
        </EmptyMedia>
        <EmptyTitle>Zatím žádné akce</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link
            to={ROUTES.newEvent}
            params={{ organizationId }}
          >
            <Plus />
            Nová akce
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
