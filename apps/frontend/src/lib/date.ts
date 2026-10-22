import { format, parseISO } from "date-fns"

export function formatDate(date: string | number | Date) {
  if (typeof date === "string") {
    date = parseISO(date)
  }
  return format(date, "dd-MM-yyyy H:mm")
}

// Calendar dates (`yyyy-MM-dd`) have no time and no zone, so they are
// formatted from their parts and never converted through a time zone.
function calendarParts(value: string) {
  const [year = "", month = "", day = ""] = value.split("-")
  return { year, month: String(Number(month)), day: String(Number(day)) }
}

/** "1. 7. 2027" */
export function formatCalendarDate(value: string) {
  const { year, month, day } = calendarParts(value)
  return `${day}. ${month}. ${year}`
}

/** Inclusive range: "1. 7. – 7. 7. 2027", or one date for a one-day term. */
export function formatCalendarRange(startDate: string, endDate: string) {
  if (startDate === endDate) return formatCalendarDate(startDate)
  const start = calendarParts(startDate)
  const end = formatCalendarDate(endDate)
  if (start.year === calendarParts(endDate).year) return `${start.day}. ${start.month}. – ${end}`
  return `${formatCalendarDate(startDate)} – ${end}`
}

const pragueDateTime = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

/** A server timestamp as Prague wall-clock time: "20. 10. 2026 14:03". */
export function formatPragueDateTime(value: string) {
  return pragueDateTime.format(new Date(value))
}

const pragueDate = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
  year: "numeric",
})

/** The Prague calendar day of a server timestamp: "28. 6. 2027". */
export function formatPragueDate(value: string) {
  return pragueDate.format(new Date(value))
}
