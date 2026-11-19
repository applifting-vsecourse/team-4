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

/** "8:30 – 10:00" */
export const formatProgrammeRange = (startTime: string, endTime: string) =>
  `${formatProgrammeTime(startTime)} – ${formatProgrammeTime(endTime)}`

const toProgrammeItem = (item: ProgrammeItemData): ProgrammeDay["items"][number] => ({
  id: item.id,
  time: formatProgrammeRange(item.startTime, item.endTime),
  title: item.title,
  place: item.place ?? undefined,
  description: item.description ?? undefined,
})

/** Splits the chronological items of a term into the days that have any. */
export function groupByDay(items: ProgrammeItemData[]): ProgrammeDay[] {
  const days: ProgrammeDay[] = []
  for (const item of items) {
    let day = days.at(-1)
    if (day?.id !== item.startDate) {
      day = { id: item.startDate, label: formatProgrammeDay(item.startDate), items: [] }
      days.push(day)
    }
    day.items.push(toProgrammeItem(item))
  }
  return days
}

/** Every calendar day from `startDate` to `endDate`, both included. */
function eachDay(startDate: string, endDate: string) {
  const days: string[] = []
  const [year = 0, month = 1, day = 1] = startDate.split("-").map(Number)
  const cursor = new Date(Date.UTC(year, month - 1, day))
  for (let date = startDate; date <= endDate; date = cursor.toISOString().slice(0, 10)) {
    days.push(date)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

/**
 * Every day of the term, the ones without items too. Items left outside the
 * term by a later change of its dates get their own days, so they can still be
 * edited or deleted.
 */
export function termCalendar(
  term: { startDate: string; endDate: string },
  items: ProgrammeItemData[],
): ProgrammeDay[] {
  const withItems = new Map(groupByDay(items).map((day) => [day.id, day]))
  const termDays = eachDay(term.startDate, term.endDate)
  const outside = [...withItems.keys()].filter((date) => !termDays.includes(date))
  return [...termDays, ...outside]
    .sort()
    .map((date) => withItems.get(date) ?? { id: date, label: formatProgrammeDay(date), items: [] })
}
