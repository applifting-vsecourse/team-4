import { formatCalendarRange, formatPragueDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import {
  type ChangeKind,
  type ChangeSummaryData,
  type RegistrationChange,
} from "@/features/registrations/api/registrationChangeSchemas"
import { type ChangeSummaryProps } from "@/features/registrations/components/ChangeSummary"
import { genderText } from "@/features/registrations/lib/gender"

const FIELD_LABELS = {
  firstName: "Jméno",
  lastName: "Příjmení",
  phone: "Telefon",
  gender: "Pohlaví pro ubytování",
} as const

const valueText = (value: ChangeSummaryData["values"][number], side: "original" | "proposed") =>
  value.field === "gender" ? genderText(value[side]) : value[side]

/** The balance as one signed line: a debt, settled, or an overpayment. */
const balanceText = (balanceMinor: number) => {
  if (balanceMinor > 0) return `Dluh ${formatCzk(balanceMinor)}`
  if (balanceMinor < 0) return `Přeplatek ${formatCzk(-balanceMinor)}`
  return "Vyrovnáno"
}

/** The server's summary as the comparison tables show it. */
export function toSummaryProps(summary: ChangeSummaryData): ChangeSummaryProps {
  const { original, proposed } = summary
  return {
    values: summary.values.map((value) => ({
      label: FIELD_LABELS[value.field],
      original: valueText(value, "original"),
      proposed: valueText(value, "proposed"),
    })),
    terms: summary.terms.map((term) => ({
      id: term.termId,
      label: term.label,
      dates: formatCalendarRange(term.startDate, term.endDate),
      price: formatCzk(term.priceMinor),
      original: term.original,
      proposed: term.proposed,
    })),
    // Money is compared only where a term changes; a data change alone has none.
    money: summary.terms.some((term) => term.original !== term.proposed)
      ? [
          {
            label: "K úhradě za potvrzené termíny",
            original: formatCzk(original.dueMinor),
            proposed: formatCzk(proposed.dueMinor),
          },
          {
            label: "Zaplaceno",
            original: formatCzk(original.paidMinor),
            proposed: formatCzk(proposed.paidMinor),
          },
          {
            label: "Saldo",
            original: balanceText(original.balanceMinor),
            proposed: balanceText(proposed.balanceMinor),
          },
        ]
      : [],
  }
}

/** What the change is about, e.g. "Přesun termínu". */
export function describeKinds(kinds: ChangeKind[]) {
  const labels: Record<ChangeKind, string> = {
    data: "Úprava údajů",
    move: "Přesun termínu",
    cancel_terms: "Odhlášení z termínu",
    cancel_all: "Odhlášení přihlášky",
  }
  return kinds.map((kind) => labels[kind]).join(", ")
}

/** The terms a change touches, e.g. "Turnus 1 → Turnus 3" or "Turnus 1, Turnus 2". */
export function describeTerms(change: Pick<RegistrationChange, "kinds" | "summary">) {
  const { terms } = change.summary
  const released = terms.filter((term) => term.proposed === "cancelled")
  const added = terms.filter(
    (term) =>
      term.original !== "confirmed" &&
      term.original !== "waitlisted" &&
      term.proposed !== null &&
      term.proposed !== "cancelled",
  )
  if (change.kinds.includes("move") && released.length > 0 && added.length > 0) {
    return `${released.map((term) => term.label).join(", ")} → ${added.map((term) => term.label).join(", ")}`
  }
  return terms.map((term) => term.label).join(", ")
}

/** One history line, e.g. "Přesun termínu schválen". */
export function describeHistoryEntry(change: RegistrationChange) {
  const what = describeKinds(change.kinds)
  const outcome = {
    pending: "odesláno k schválení",
    applied: "provedeno",
    approved: "schváleno",
    rejected: "zamítnuto",
  }[change.status]
  return `${what} (${describeTerms(change)}) – ${outcome}`
}

export const formatChangeTime = (value: string) => formatPragueDateTime(value)
