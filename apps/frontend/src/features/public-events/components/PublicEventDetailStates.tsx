import { CalendarX, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

// Detail akce (F55): states without event data. Design only.

/** Unpublished, unknown and unavailable events look the same and show no event data. */
export function PublicEventDetailUnavailable({ catalogHref }: { catalogHref: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarX />
        </EmptyMedia>
        <EmptyTitle>Akce není dostupná</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button
          asChild
          variant="outline"
        >
          <a href={catalogHref}>Zpět do katalogu</a>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** The load failed; not presented as a missing event. */
export function PublicEventDetailError({
  catalogHref,
  onRetry,
}: {
  catalogHref: string
  onRetry: () => void
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>Detail akce se nepodařilo načíst</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onRetry}>Zkusit znovu</Button>
          <Button
            asChild
            variant="outline"
          >
            <a href={catalogHref}>Zpět do katalogu</a>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  )
}
