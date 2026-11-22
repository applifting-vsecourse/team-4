import { Plus } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import {
  ProgrammeDaySection,
  type ProgrammeDay,
} from "@/features/programme/components/ProgrammeList"

type ProgrammeCalendarProps = {
  /** Every day of the term, the ones without items too. */
  days: ProgrammeDay[]
  /** Days opened by the organizer or by a saved item; the rest follow their items. */
  openOverrides?: Record<string, boolean>
  /** The programme could not be loaded; the days are not shown as empty. */
  isLoadFailed?: boolean
  /** The first load is running; the days are not shown as empty. */
  isLoading?: boolean
  isRetrying?: boolean
  onToggleDay?: (dayId: string, isOpen: boolean) => void
  onAdd?: (dayId: string) => void
  onEdit?: (itemId: string) => void
  onRetry?: () => void
}

// Správa akce → Program (F65-1), organizer. Each day is a compact section with
// its own add action. Every value and action is passed in.
export function ProgrammeCalendar({
  days,
  openOverrides = {},
  isLoadFailed = false,
  isLoading = false,
  isRetrying,
  onToggleDay,
  onAdd,
  onEdit,
  onRetry,
}: ProgrammeCalendarProps) {
  if (isLoadFailed) {
    return (
      <LoadError
        title="Program se nepodařilo načíst"
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    )
  }
  if (isLoading) {
    return (
      <LoadingBlock
        label="Načítání programu"
        className="space-y-2"
      >
        {days.map((day) => (
          <Skeleton
            key={day.id}
            className="h-14 w-full"
          />
        ))}
      </LoadingBlock>
    )
  }
  return (
    <ul className="space-y-2">
      {days.map((day) => {
        const isOpen = openOverrides[day.id] ?? day.items.length > 0
        return (
          <ProgrammeDaySection
            key={day.id}
            day={day}
            isOpen={isOpen}
            onOpenChange={(willOpen) => onToggleDay?.(day.id, willOpen)}
            emptyMessage="Bez položek"
            addAction={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAdd?.(day.id)}
                className="shrink-0"
              >
                <Plus aria-hidden />
                Přidat položku
              </Button>
            }
            onEdit={onEdit}
          />
        )
      })}
    </ul>
  )
}
