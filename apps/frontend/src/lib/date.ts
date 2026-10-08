import { format, parseISO } from "date-fns"

export function formatDate(date: string | number | Date) {
  if (typeof date === "string") {
    date = parseISO(date)
  }
  return format(date, "dd-MM-yyyy H:mm")
}
