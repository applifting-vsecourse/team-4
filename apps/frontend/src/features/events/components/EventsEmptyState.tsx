import { Link } from "@tanstack/react-router"
import { CalendarX } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function EventsEmptyState({ organizationId }: { organizationId: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarX />
        </EmptyMedia>
        <EmptyTitle>Zatím žádné akce</EmptyTitle>
        <EmptyDescription>Tato organizace zatím nemá žádnou akci.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link
            to={ROUTES.newEvent}
            params={{ organizationId }}
          >
            Nová akce
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
