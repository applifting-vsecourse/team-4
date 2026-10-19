import { CalendarX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

// Creating events is S2-04; the button stays disabled until that route exists.
export function EventsEmptyState() {
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
        <Button disabled>Nová akce</Button>
      </EmptyContent>
    </Empty>
  )
}
