import { Clock, MapPin } from "lucide-react"

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

// One item: its time range, title and the place and description when filled
// in. Missing ones are left out, not replaced by placeholders.
export function ProgrammeItemContent({ item }: { item: ProgrammeItem }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 font-normal sm:flex-row sm:items-start sm:gap-4">
      <p className="flex shrink-0 items-center gap-1.5 font-mono text-sm tabular-nums sm:w-36">
        <Clock
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
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
        {item.description ? <p className="text-sm wrap-break-word">{item.description}</p> : null}
      </div>
    </div>
  )
}

// Programme of one term, split by days and sorted chronologically (F65),
// read only. Every value is passed in.
export function ProgrammeList({ days }: { days: ProgrammeDay[] }) {
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
                className="flex p-4"
              >
                <ProgrammeItemContent item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
