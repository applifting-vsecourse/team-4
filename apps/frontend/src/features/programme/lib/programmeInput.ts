import { formatCalendarRange } from "@/lib/date"

import { type ProgrammeItemInput } from "@/features/programme/api/programmeSchemas"

export type ProgrammeItemValues = {
  title: string
  /** `yyyy-MM-dd`, or "" when nothing is chosen. */
  date: string
  /** `HH:mm`, or "". */
  time: string
  place: string
  description: string
}

export type ProgrammeItemErrors = Partial<Record<keyof ProgrammeItemValues, string>>

const MAX_TITLE = 200
const MAX_PLACE = 200
const MAX_DESCRIPTION = 1000

type TermRange = { startDate: string; endDate: string }

const isCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/** The entered values as an API input, or the message to show at each wrong field. */
export function readProgrammeForm(
  values: ProgrammeItemValues,
  term: TermRange,
): { input: ProgrammeItemInput } | { errors: ProgrammeItemErrors } {
  const errors: ProgrammeItemErrors = {}
  const title = values.title.trim()
  if (!title) errors.title = "Vyplňte název položky."
  else if (title.length > MAX_TITLE) errors.title = `Název může mít nejvýše ${MAX_TITLE} znaků.`

  if (!values.date || !isCalendarDate(values.date)) errors.date = "Vyberte platné datum."
  else if (values.date < term.startDate || values.date > term.endDate) {
    errors.date = `Datum musí být v rozsahu termínu, ${formatCalendarRange(term.startDate, term.endDate)}.`
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) errors.time = "Zadejte čas začátku."

  const place = values.place.trim()
  const description = values.description.trim()
  if (place.length > MAX_PLACE) errors.place = `Místo může mít nejvýše ${MAX_PLACE} znaků.`
  if (description.length > MAX_DESCRIPTION) {
    errors.description = `Popis může mít nejvýše ${MAX_DESCRIPTION} znaků.`
  }

  if (Object.keys(errors).length > 0) return { errors }
  return {
    input: {
      title,
      startDate: values.date,
      startTime: values.time,
      place: place || null,
      description: description || null,
    },
  }
}
