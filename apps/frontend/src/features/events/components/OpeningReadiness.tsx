import { Link } from "@tanstack/react-router"
import { CircleCheck, TriangleAlert } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { type EventDetail, type OpeningBlocker } from "@/features/events/api/eventSchemas"
import { TermDialog } from "@/features/events/components/TermDialog"

type Condition = { blocker: OpeningBlocker; label: string; fixIn: "edit" | "terms" | "payments" }

const CONDITIONS: Condition[] = [
  { blocker: "name", label: "Název akce", fixIn: "edit" },
  { blocker: "description", label: "Popis akce", fixIn: "edit" },
  { blocker: "location", label: "Místo konání", fixIn: "edit" },
  { blocker: "terms", label: "Alespoň jeden termín", fixIn: "terms" },
  {
    blocker: "paymentSettings",
    label: "Číslo účtu a počet dní do připomenutí platby",
    fixIn: "payments",
  },
]

// Every term costs 0 Kč: no bank account or reminder is needed (S3-C04).
const FREE_PAYMENT_CONDITION: Condition = {
  blocker: "paymentSettings",
  label: "Platební údaje nejsou potřeba, všechny termíny jsou zdarma",
  fixIn: "payments",
}

// With only 0 Kč terms "s cenou" would mislead, and no payment data is needed.
const freeCondition = (condition: Condition): Condition =>
  condition.blocker === "paymentSettings"
    ? FREE_PAYMENT_CONDITION
    : condition.blocker === "terms"
      ? { ...condition, label: "Alespoň jeden termín (zdarma)" }
      : condition

type OpeningConditionsProps = {
  organizationId: string
  event: EventDetail
  shouldShowOnlyMissing?: boolean
  onTermAdded?: () => void
}

export function OpeningConditions({
  organizationId,
  event,
  shouldShowOnlyMissing = false,
  onTermAdded,
}: OpeningConditionsProps) {
  const isFree = event.terms.length > 0 && event.terms.every((term) => term.priceMinor === 0)
  const conditions = shouldShowOnlyMissing
    ? CONDITIONS.filter(({ blocker }) => event.openingBlockers.includes(blocker))
    : CONDITIONS

  return (
    <div>
      {!shouldShowOnlyMissing ? (
        <h3 className="mb-2 text-sm font-medium">Podmínky otevření</h3>
      ) : null}
      <ul className="space-y-1">
        {conditions.map((condition) => (
          <ConditionRow
            key={condition.blocker}
            condition={isFree ? freeCondition(condition) : condition}
            isMissing={event.openingBlockers.includes(condition.blocker)}
            organizationId={organizationId}
            event={event}
            onTermAdded={onTermAdded}
          />
        ))}
      </ul>
    </div>
  )
}

export function OpeningReadiness({
  organizationId,
  event,
  onTermAdded,
}: Omit<OpeningConditionsProps, "shouldShowOnlyMissing">) {
  return (
    <section aria-labelledby="opening-readiness-heading">
      <h2
        id="opening-readiness-heading"
        className="mb-4 text-h4"
      >
        Před otevřením přihlašování
      </h2>
      <Card>
        <CardContent>
          {event.openingBlockers.length > 0 ? (
            <OpeningConditions
              organizationId={organizationId}
              event={event}
              shouldShowOnlyMissing
              onTermAdded={onTermAdded}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p>Všechny podmínky jsou splněné.</p>
              <Button
                asChild
                variant="link"
                size="sm"
              >
                <Link
                  to={ROUTES.eventSettings}
                  params={{ organizationId, eventId: event.id }}
                  hash="registration-heading"
                >
                  Přejít k otevření přihlašování
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

type ConditionRowProps = {
  condition: Condition
  isMissing: boolean
  organizationId: string
  event: EventDetail
  onTermAdded?: () => void
}

function ConditionRow({
  condition,
  isMissing,
  organizationId,
  event,
  onTermAdded,
}: ConditionRowProps) {
  return (
    <li className="flex min-h-9 items-center gap-2 text-sm">
      {isMissing ? (
        <TriangleAlert
          aria-hidden
          className="size-4 shrink-0 text-warning"
        />
      ) : (
        <CircleCheck
          aria-hidden
          className="size-4 shrink-0 text-success"
        />
      )}
      <span>
        {condition.label}
        <span className="sr-only">{isMissing ? " – chybí" : " – splněno"}</span>
      </span>
      {isMissing && condition.fixIn === "terms" ? (
        <TermDialog
          organizationId={organizationId}
          eventId={event.id}
          allTerms={event.terms}
          onSaved={onTermAdded}
          trigger={
            <Button
              variant="link"
              size="sm"
              className="ml-auto"
            >
              Přidat termín
            </Button>
          }
        />
      ) : isMissing ? (
        <Button
          asChild
          variant="link"
          size="sm"
          className="ml-auto"
        >
          {condition.fixIn === "edit" ? (
            <Link
              to={ROUTES.editEvent}
              params={{ organizationId, eventId: event.id }}
            >
              Doplnit
            </Link>
          ) : (
            <Link
              to={ROUTES.eventSettings}
              params={{ organizationId, eventId: event.id }}
              hash="payments-heading"
            >
              Doplnit
            </Link>
          )}
        </Button>
      ) : null}
    </li>
  )
}
