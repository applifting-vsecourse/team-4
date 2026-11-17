import { Link } from "@tanstack/react-router"
import { CalendarCog, Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"

// An organization without events.
export function EventsEmptyState({ organizationId }: { organizationId: string }) {
  return (
    <EmptyState
      icon={CalendarCog}
      title="Zatím žádné akce"
      action={
        <Button asChild>
          <Link
            to={ROUTES.newEvent}
            params={{ organizationId }}
          >
            <Plus />
            Nová akce
          </Link>
        </Button>
      }
    />
  )
}
