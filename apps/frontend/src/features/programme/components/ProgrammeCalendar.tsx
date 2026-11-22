import { CalendarDays, ChevronDown, Clock, MapPin, Pencil, Plus } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"

import { type ProgrammeDay } from "@/features/programme/components/ProgrammeList"

/** "0 položek", "1 položka", "4 položky", "8 položek". */
function formatItemCount(count: number) {
  if (count === 1) return "1 položka"
  return count > 1 && count < 5 ? `${count} položky` : `${count} položek`
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
          <li
            key={day.id}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <Collapsible
              open={isOpen}
              onOpenChange={(willOpen) => onToggleDay?.(day.id, willOpen)}
            >
              <div className="flex min-w-0 items-center gap-2 bg-muted p-2 sm:gap-3 sm:px-4">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="group h-auto min-h-10 min-w-0 flex-1 justify-start text-left whitespace-normal"
                  >
                    <ChevronDown
                      aria-hidden
                      className="shrink-0 transition-transform group-data-[state=closed]:-rotate-90 motion-reduce:transition-none"
                    />
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-semibold">{day.label}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {formatItemCount(day.items.length)}
                      </span>
                    </span>
                  </Button>
                </CollapsibleTrigger>
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
              </div>
              <CollapsibleContent>
                {day.items.length > 0 ? (
                  <ul className="divide-y divide-border bg-card">
                    {day.items.map((item) => (
                      <li
                        key={item.id}
                        className="min-w-0"
                      >
                        <div className="px-3 py-3 sm:px-4">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto w-full min-w-0 justify-start text-left whitespace-normal"
                            onClick={() => onEdit?.(item.id)}
                          >
                            <span className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:gap-4">
                              <span className="block min-w-0 space-y-1 sm:w-44 sm:shrink-0">
                                <span className="flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
                                  <Clock
                                    aria-hidden
                                    className="size-4 shrink-0 text-muted-foreground"
                                  />
                                  <time>{item.time}</time>
                                </span>
                                {item.place ? (
                                  <span className="flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
                                    <MapPin
                                      aria-hidden
                                      className="mt-0.5 size-4 shrink-0"
                                    />
                                    <span className="min-w-0 wrap-break-word">{item.place}</span>
                                  </span>
                                ) : null}
                              </span>
                              <span className="block min-w-0 flex-1 space-y-1">
                                <span className="block font-medium wrap-break-word">
                                  {item.title}
                                </span>
                                {item.description ? (
                                  <span className="block text-sm font-normal wrap-break-word">
                                    {item.description}
                                  </span>
                                ) : null}
                              </span>
                              <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                                <Pencil aria-hidden />
                                Upravit
                              </span>
                            </span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <CalendarDays
                      aria-hidden
                      className="size-4 shrink-0"
                    />
                    <p>Bez položek</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </li>
        )
      })}
    </ul>
  )
}
