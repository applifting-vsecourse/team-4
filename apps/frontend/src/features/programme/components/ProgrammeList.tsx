import { Clock, MapPin, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export type ProgrammeItem = {
  id: string
  /** Start time in Europe/Prague, e.g. "18:00". */
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

type ProgrammeListProps = {
  days: ProgrammeDay[]
  /** Organizer view: every item can be edited and deleted. */
  isEditable?: boolean
}

// Programme of one term, split by days and sorted chronologically (F65).
// Design only: every value is passed in. Missing place and description are
// left out, not replaced by placeholders.
export function ProgrammeList({ days, isEditable = false }: ProgrammeListProps) {
  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section
          key={day.id}
          aria-labelledby={`programme-day-${day.id}`}
        >
          <h3
            id={`programme-day-${day.id}`}
            className="mb-2 text-sm font-medium"
          >
            {day.label}
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {day.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-4 p-4"
              >
                <p className="flex w-16 shrink-0 items-center gap-1.5 font-mono text-sm">
                  <Clock
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                  <time>{item.time}</time>
                </p>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium wrap-break-word">{item.title}</p>
                  {item.place ? (
                    <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0"
                      />
                      <span className="wrap-break-word">{item.place}</span>
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className="text-sm wrap-break-word">{item.description}</p>
                  ) : null}
                </div>
                {isEditable ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Upravit položku ${item.title}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Smazat položku ${item.title}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
