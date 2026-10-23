import { CircleCheck } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPragueDateTime } from "@/lib/date"

import { type RegistrationResult as Result } from "@/features/registrations/api/registrationSchemas"
import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"
import { ParticipantTermList } from "@/features/registrations/components/ParticipantTermList"

// What the server saved for the registration just submitted, term by term
// (S2-08, S2-14): the event, every term with its own status and the payment
// summary, all from the POST response. It opens no session, so other
// registrations of the e-mail stay out of reach until the magic link (S2-13).
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
        <CardHeader>
          <CardTitle>
            <h3 className="text-h4 wrap-break-word">{result.event.name}</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ParticipantTermList terms={result.terms} />
            <div className="border-t border-border pt-4">
              <ParticipantPaymentSummary
                selectedPriceMinor={result.selectedPriceMinor}
                amountDueMinor={result.amountDueMinor}
                paidMinor={0}
                balanceMinor={result.amountDueMinor}
                instructions={result.paymentInstructions}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {hasWaitlisted ? (
        <p className="text-sm text-muted-foreground">
          Pokud se místo uvolní a bude vám přiděleno, dáme vám vědět e-mailem.
        </p>
      ) : null}

      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Přihlášku znovu otevřete a uvidíte její aktuální stav přes „Moje přihlášky“ po ověření
          odkazem z e-mailu.
        </p>
        <Button
          variant="outline"
          asChild
        >
          <a href={ROUTES.myRegistrations}>Moje přihlášky</a>
        </Button>
      </div>
    </section>
  )
}
