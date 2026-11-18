import { ChevronDown, Plus } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"

import {
  ProgrammeItemContent,
  type ProgrammeDay,
} from "@/features/programme/components/ProgrammeList"

/** "Bez položek", "1 položka", "4 položky", "8 položek". */
function formatItemCount(count: number) {
  if (count === 0) return "Bez položek"
  if (count === 1) return "1 položka"
  return count < 5 ? `${count} položky` : `${count} položek`
}

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

// Správa akce → Program (F65-1), organizer. Every day of the selected term is
// a row that opens to its items; each day has its own add button. Every value
// and action is passed in.
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
    <ul className="divide-y divide-border rounded-lg border border-border">
      {days.map((day) => {
        const isOpen = openOverrides[day.id] ?? day.items.length > 0
        return (
          <li key={day.id}>
            <Collapsible
              open={isOpen}
              onOpenChange={(willOpen) => onToggleDay?.(day.id, willOpen)}
            >
              <div className="flex items-center gap-2 p-2">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto min-h-9 min-w-0 flex-1 justify-start"
                  >
                    <ChevronDown
                      aria-hidden
                      className="shrink-0 -rotate-90 transition-transform in-data-[state=open]:rotate-0 motion-reduce:transition-none"
                    />
                    <span className="font-medium">{day.label}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {formatItemCount(day.items.length)}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Přidat položku"
                  onClick={() => onAdd?.(day.id)}
                >
                  <Plus />
                </Button>
              </div>
              <CollapsibleContent>
                {day.items.length > 0 ? (
                  <ul className="divide-y divide-border border-t border-border">
                    {day.items.map((item) => (
                      <li key={item.id}>
                        <Button
                          variant="ghost"
                          className="h-auto w-full justify-start text-left whitespace-normal"
                          onClick={() => onEdit?.(item.id)}
                        >
                          <ProgrammeItemContent item={item} />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground">
                    Tento den nemá žádné položky.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </li>
        )
      })}
    </ul>
  )
}
