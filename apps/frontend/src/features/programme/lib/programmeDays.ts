import { formatCalendarDate } from "@/lib/date"

import { type ProgrammeItemData } from "@/features/programme/api/programmeSchemas"
import { type ProgrammeDay } from "@/features/programme/components/ProgrammeList"

const weekday = new Intl.DateTimeFormat("cs-CZ", { weekday: "long", timeZone: "UTC" })

/** "Pátek 6. 11. 2026"; a calendar date has no zone, so the weekday is read in UTC. */
export function formatProgrammeDay(date: string) {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number)
  const name = weekday.format(new Date(Date.UTC(year, month - 1, day)))
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${formatCalendarDate(date)}`
}

/** "08:30" is shown as "8:30". */
export const formatProgrammeTime = (time: string) => time.replace(/^0/, "")

/** Splits the chronological items of a term into days. */
export function groupByDay(items: ProgrammeItemData[]): ProgrammeDay[] {
  const days: ProgrammeDay[] = []
  for (const item of items) {
    let day = days.at(-1)
    if (day?.id !== item.startDate) {
      day = { id: item.startDate, label: formatProgrammeDay(item.startDate), items: [] }
      days.push(day)
    }
    day.items.push({
      id: item.id,
      time: formatProgrammeTime(item.startTime),
      title: item.title,
      place: item.place ?? undefined,
      description: item.description ?? undefined,
    })
  }
  return days
}
