import { useState, type ReactNode } from "react"
import { CalendarDays, ChevronDown, Clock, MapPin, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export type ProgrammeItem = {
  id: string
  /** Start and end in Europe/Prague, e.g. "18:00 – 19:30". */
  time: string
  title: string
  place?: string
  description?: string
}

export type ProgrammeDay = {
  id: string
  /** Formatted day, e.g. "Pátek 6. 11. 2026". */
  label: string
  items: ProgrammeItem[]
}

/** "0 položek", "1 položka", "4 položky", "8 položek". */
function formatItemCount(count: number) {
  if (count === 1) return "1 položka"
  return count > 1 && count < 5 ? `${count} položky` : `${count} položek`
}

// Shared by organizer and participant views; only the organizer supplies an
// action. Missing place and description stay omitted in both views.
export function ProgrammeItemContent({
  item,
  action,
}: {
  item: ProgrammeItem
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-2 font-normal sm:flex-row sm:gap-4">
      <div className="block min-w-0 space-y-1 sm:w-44 sm:shrink-0">
        <p className="flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
          <Clock
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <time>{item.time}</time>
        </p>
        {item.place ? (
          <p className="flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
            />
            <span className="min-w-0 wrap-break-word">{item.place}</span>
          </p>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium wrap-break-word">{item.title}</p>
        {item.description ? <p className="text-sm wrap-break-word">{item.description}</p> : null}
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">{action}</div>
      ) : null}
    </div>
  )
}

/** Day header, collapsible item list and surfaces shared by both audiences. */
export function ProgrammeDaySection({
  day,
  isOpen,
  onOpenChange,
  addAction,
  onEdit,
  emptyMessage,
}: {
  day: ProgrammeDay
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  addAction?: ReactNode
  onEdit?: (itemId: string) => void
  emptyMessage?: string
}) {
  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card">
      <Collapsible
        open={isOpen}
        onOpenChange={onOpenChange}
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
          {addAction ? <div className="shrink-0">{addAction}</div> : null}
        </div>
        <CollapsibleContent>
          {day.items.length > 0 ? (
            <ul className="divide-y divide-border bg-card">
              {day.items.map((item) => (
                <li
                  key={item.id}
                  className="min-w-0 px-3 py-3 sm:px-4"
                >
                  {onEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full min-w-0 justify-start text-left whitespace-normal"
                      onClick={() => onEdit(item.id)}
                    >
                      <ProgrammeItemContent
                        item={item}
                        action={
                          <>
                            <Pencil aria-hidden />
                            Upravit
                          </>
                        }
                      />
                    </Button>
                  ) : (
                    <ProgrammeItemContent item={item} />
                  )}
                </li>
              ))}
            </ul>
          ) : emptyMessage ? (
            <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <CalendarDays
                aria-hidden
                className="size-4 shrink-0"
              />
              <p>{emptyMessage}</p>
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

// Participant programme of one term, split by days and sorted chronologically
// (F65). Days with items start open and can be collapsed.
export function ProgrammeList({
  days,
  initialOpenDayId,
}: {
  days: ProgrammeDay[]
  /** Optional participant-only initial state; organizers keep their calendar defaults. */
  initialOpenDayId?: string
}) {
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({})

  return (
    <ul className="space-y-2">
      {days.map((day) => (
        <ProgrammeDaySection
          key={day.id}
          day={day}
          isOpen={
            openOverrides[day.id] ??
            (initialOpenDayId ? day.id === initialOpenDayId : day.items.length > 0)
          }
          onOpenChange={(isOpen) =>
            setOpenOverrides((current) => ({ ...current, [day.id]: isOpen }))
          }
        />
      ))}
    </ul>
  )
}
