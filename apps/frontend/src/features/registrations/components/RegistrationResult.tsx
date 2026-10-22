import { CircleCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatCalendarRange, formatPragueDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import {
  type ParticipationStatus,
  type RegistrationResult as Result,
} from "@/features/registrations/api/registrationSchemas"

const STATUS: Record<ParticipationStatus, { label: string; variant: "success" | "warning" }> = {
  confirmed: { label: "Potvrzeno", variant: "success" },
  waitlisted: { label: "Náhradník", variant: "warning" },
}

// What the server saved for the registration just submitted, term by term
// (S2-08). A minimal view from the POST response; S2-14 (#93) completes it.
export function RegistrationResult({ result }: { result: Result }) {
  const hasWaitlisted = result.terms.some((term) => term.status === "waitlisted")

  return (
    <section
      aria-labelledby="registration-result-heading"
      className="space-y-6"
    >
      <div className="flex items-start gap-3">
        <CircleCheck
          aria-hidden
          className="mt-0.5 size-6 shrink-0 text-success"
        />
        <div className="min-w-0">
          <h2
            id="registration-result-heading"
            tabIndex={-1}
            className="text-h3 outline-none"
          >
            Přihláška je uložená
          </h2>
          <p className="mt-2 text-sm break-words text-muted-foreground">
            {result.firstName} {result.lastName}, {result.email}. Přijato{" "}
            {formatPragueDateTime(result.receivedAt)} (Europe/Prague).
          </p>
        </div>
      </div>

      <Card>
        <ul className="-my-6 divide-y divide-border">
          {result.terms.map((term) => {
            const status = STATUS[term.status]
            return (
              <li
                key={term.termId}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{term.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCalendarRange(term.startDate, term.endDate)} ·{" "}
                    <span className="font-mono">{formatCzk(term.priceMinor)}</span>
                  </p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="space-y-2 text-sm">
        <p>
          Cena vybraných termínů:{" "}
          <span className="font-mono font-medium">{formatCzk(result.selectedPriceMinor)}</span>
        </p>
        {hasWaitlisted ? (
          <p className="text-muted-foreground">
            Pokud se místo uvolní a bude vám přiděleno, dáme vám vědět e-mailem.
          </p>
        ) : null}
      </div>
    </section>
  )
}
