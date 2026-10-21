import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Check, CircleCheck, Copy, Lock, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { readApiError } from "@/lib/apiError"

import { type EventDetail, type OpeningBlocker } from "@/features/events/api/eventSchemas"
import { EventStatusBadge } from "@/features/events/components/EventStatusBadge"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { useOpenRegistration } from "@/features/events/hooks/useOpenRegistration"
import { publicEventUrl } from "@/features/events/lib/publicLink"

type Condition = { blocker: OpeningBlocker; label: string; fixIn: "edit" | "terms" | "payments" }

const CONDITIONS: Condition[] = [
  { blocker: "name", label: "Název akce", fixIn: "edit" },
  { blocker: "description", label: "Popis akce", fixIn: "edit" },
  { blocker: "location", label: "Místo konání", fixIn: "edit" },
  { blocker: "terms", label: "Alespoň jeden termín s cenou", fixIn: "terms" },
  {
    blocker: "paymentSettings",
    label: "Číslo účtu a počet dní do připomenutí platby",
    fixIn: "payments",
  },
]

type RegistrationSectionProps = {
  organizationId: string
  event: EventDetail
}

// Card "Přihlašování" of the event settings (S2-06, Wireframy O1–O3): the
// state, the permanent public link and the one-way opening. Closing and
// reopening are deferred by the PM.
export function RegistrationSection({ organizationId, event }: RegistrationSectionProps) {
  const open = useOpenRegistration(organizationId, event.id)
  const refreshEvent = useRefreshEvent(organizationId, event.id)
  const [openError, setOpenError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [hasCopyFailed, setHasCopyFailed] = useState(false)

  const link = publicEventUrl(event.publicId)
  const isDraft = event.status === "draft"
  const canOpen = isDraft && event.openingBlockers.length === 0

  const handleOpen = async () => {
    setOpenError(null)
    try {
      await open.mutateAsync()
    } catch (error) {
      const apiError = readApiError(error)
      // The server has the last word: show what it found missing now.
      if (apiError.status === 404 || apiError.status === 409) await refreshEvent()
      setOpenError(
        apiError.code === "opening_conditions_not_met"
          ? "Přihlašování nelze otevřít, doplňte chybějící údaje."
          : apiError.status === 404
            ? "Záznam není dostupný."
            : "Přihlašování se nepodařilo otevřít. Zkuste to prosím znovu.",
      )
    }
  }

  // "Zkopírováno" appears only after the browser confirmed the copy.
  const handleCopy = async () => {
    setHasCopyFailed(false)
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
      toast.success("Odkaz byl zkopírován.")
      window.setTimeout(() => setIsCopied(false), 3000)
    } catch {
      setIsCopied(false)
      setHasCopyFailed(true)
    }
  }

  return (
    <section aria-labelledby="registration-heading">
      <h2
        id="registration-heading"
        className="mb-4 text-h4"
      >
        Přihlašování
      </h2>
      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Stav</span>
            <EventStatusBadge status={event.status} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="public-link">Veřejný odkaz na přihlášku</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="public-link"
                className="min-w-0 flex-1 basis-60"
                readOnly
                value={link}
                onFocus={(inputEvent) => inputEvent.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
              >
                {isCopied ? <Check /> : <Copy />}
                {isCopied ? "Zkopírováno" : "Kopírovat"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Odkaz je stále stejný. Do otevření přihlašování návštěvníkům ukáže, že akce není
              dostupná.
            </p>
            {hasCopyFailed ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                Odkaz se nepodařilo zkopírovat. Označte ho výše a zkopírujte ručně.
              </p>
            ) : null}
          </div>

          {isDraft ? (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">Podmínky otevření</h3>
                <ul className="space-y-1">
                  {CONDITIONS.map((condition) => (
                    <ConditionRow
                      key={condition.blocker}
                      condition={condition}
                      isMissing={event.openingBlockers.includes(condition.blocker)}
                      organizationId={organizationId}
                      eventId={event.id}
                    />
                  ))}
                </ul>
              </div>

              <Alert>
                <Lock />
                <AlertTitle>
                  Otevřením přihlašování zamknete název, popis, místo, termíny a ceny.
                </AlertTitle>
              </Alert>

              {openError ? (
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>{openError}</AlertTitle>
                </Alert>
              ) : null}

              <Button
                type="button"
                disabled={!canOpen || open.isPending}
                onClick={handleOpen}
              >
                Otevřít přihlašování
              </Button>
            </div>
          ) : (
            <Alert>
              <CircleCheck />
              <AlertTitle>Přihlašování je otevřené</AlertTitle>
              <AlertDescription>
                Kdokoli s odkazem uvidí údaje akce, termíny a ceny.
              </AlertDescription>
            </Alert>
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
  eventId: string
}

function ConditionRow({ condition, isMissing, organizationId, eventId }: ConditionRowProps) {
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
      {isMissing ? (
        <Button
          asChild
          variant="link"
          size="sm"
          className="ml-auto"
        >
          {condition.fixIn === "edit" ? (
            <Link
              to={ROUTES.editEvent}
              params={{ organizationId, eventId }}
            >
              Doplnit
            </Link>
          ) : (
            <Link
              to={ROUTES.eventSettings}
              params={{ organizationId, eventId }}
              hash={condition.fixIn === "terms" ? "terms-heading" : "payments-heading"}
            >
              Doplnit
            </Link>
          )}
        </Button>
      ) : null}
    </li>
  )
}
