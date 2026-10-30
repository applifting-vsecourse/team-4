import { formatCalendarRange } from "@/lib/date"

import { type Room, type RoomInput, type TermOccupancy } from "@/features/rooms/api/roomSchemas"
import { type RoomTermSetting } from "@/features/rooms/components/RoomCapacityDialog"

const MAX_BEDS = 1000
const MAX_LABEL = 100

/** The dialog's rows: the room's saved settings, or empty ones for a new room. */
export function toTermSettings(terms: TermOccupancy[], room?: Room): RoomTermSetting[] {
  return terms.map((term) => {
    const saved = room?.terms.find((roomTerm) => roomTerm.termId === term.id)
    return {
      termId: term.id,
      termLabel: term.label,
      dates: formatCalendarRange(term.startDate, term.endDate),
      isAvailable: saved?.isAvailable ?? true,
      beds: saved ? String(saved.baseBeds) : "",
      extraBeds: saved ? String(saved.extraBeds) : "",
    }
  })
}

/** A non-negative whole number, or the message to show at the field. */
export function parseBeds(value: string): { beds: number } | { error: string } {
  const text = value.trim()
  if (!/^\d+$/.test(text)) return { error: "Zadejte nezáporné celé číslo." }
  const beds = Number(text)
  if (beds > MAX_BEDS) return { error: `Nejvýše ${MAX_BEDS}.` }
  return { beds }
}

export type RoomFormResult =
  | { input: RoomInput }
  | {
      labelError?: string
      terms: RoomTermSetting[]
    }

/**
 * Validates the whole form. An available term needs both numbers; a switched-off
 * term may be blank, but a value typed there must still be valid since it is
 * saved too. Its error stays visible and is fixed by switching the term back on.
 */
export function readRoomForm(label: string, terms: RoomTermSetting[]): RoomFormResult {
  const trimmed = label.trim()
  const labelError =
    trimmed === ""
      ? "Vyplňte označení."
      : trimmed.length > MAX_LABEL
        ? `Označení může mít nejvýše ${MAX_LABEL} znaků.`
        : undefined

  // A term the room is not available in may be left blank: it is saved as 0.
  const parseField = (term: RoomTermSetting, value: string) =>
    !term.isAvailable && value.trim() === "" ? { beds: 0 } : parseBeds(value)

  const parsed = terms.map((term) => ({
    term,
    beds: parseField(term, term.beds),
    extraBeds: parseField(term, term.extraBeds),
  }))

  if (labelError || parsed.some(({ beds, extraBeds }) => "error" in beds || "error" in extraBeds)) {
    return {
      labelError,
      terms: parsed.map(({ term, beds, extraBeds }) => ({
        ...term,
        bedsError: "error" in beds ? beds.error : undefined,
        extraBedsError: "error" in extraBeds ? extraBeds.error : undefined,
      })),
    }
  }

  return {
    input: {
      label: trimmed,
      terms: parsed.map(({ term, beds, extraBeds }) => ({
        termId: term.termId,
        isAvailable: term.isAvailable,
        baseBeds: "beds" in beds ? beds.beds : 0,
        extraBeds: "beds" in extraBeds ? extraBeds.beds : 0,
      })),
    },
  }
}
