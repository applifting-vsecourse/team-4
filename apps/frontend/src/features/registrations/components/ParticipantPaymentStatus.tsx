import { Link } from "@tanstack/react-router"
import { CircleCheck } from "lucide-react"

import { ROUTES, SECTIONS } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCzk } from "@/lib/money"

import { type ParticipantRegistration } from "@/features/registrations/api/participantRegistrationSchemas"
import { BalanceAmount } from "@/features/registrations/components/BalanceAmount"
import { paymentOverview } from "@/features/registrations/lib/paymentOverview"

// The short payment status at the top of the registration detail (S5-02): what
// is left to pay, with a jump to the payment details further down.
export function ParticipantPaymentStatus({
  registration,
}: {
  registration: Pick<
    ParticipantRegistration,
    "id" | "terms" | "selectedPriceMinor" | "amountDueMinor" | "paidMinor"
  >
}) {
  const overview = paymentOverview(registration)

  if (overview.kind === "confirmed" && overview.remainingMinor > 0) {
    return (
      <section aria-label="Stav platby">
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <p className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold">
                <span>Zbývá zaplatit</span>
                <BalanceAmount
                  amount={formatCzk(overview.remainingMinor)}
                  isSettled={false}
                />
              </p>
              <Button
                variant="secondary"
                asChild
              >
                <Link
                  to={ROUTES.myRegistration}
                  params={{ registrationId: registration.id }}
                  hash={SECTIONS.payment}
                >
                  Platební údaje
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section aria-label="Stav platby">
      <Card>
        <CardContent>
          <div className="space-y-1 text-sm">{describe(overview)}</div>
        </CardContent>
      </Card>
    </section>
  )
}

function describe(overview: ReturnType<typeof paymentOverview>) {
  if (overview.kind === "cancelled") {
    return (
      <>
        <p className="font-medium">Účast zrušena</p>
        {overview.overpaidMinor > 0 ? <Overpayment minor={overview.overpaidMinor} /> : null}
      </>
    )
  }
  if (overview.kind === "preliminary") {
    return (
      <>
        <p className="font-medium">
          Předběžná cena vybraných termínů {formatCzk(overview.priceMinor)}
        </p>
        <p className="text-muted-foreground">
          {overview.priceMinor === 0
            ? "Účast je zdarma, po potvrzení nic neplatíte."
            : "Zatím nic neplaťte. Platit budete až za termíny, které organizátor potvrdí."}
        </p>
      </>
    )
  }
  if (overview.dueMinor === 0 && overview.paidMinor === 0) {
    return <p className="font-medium">Potvrzená účast je zdarma, nic neplatíte.</p>
  }
  return (
    <>
      <p className="flex items-center gap-2 text-lg leading-none font-semibold text-success">
        <CircleCheck
          aria-hidden
          className="size-5 shrink-0"
        />
        Zaplaceno
      </p>
      {overview.overpaidMinor > 0 ? <Overpayment minor={overview.overpaidMinor} /> : null}
    </>
  )
}

function Overpayment({ minor }: { minor: number }) {
  return (
    <p>
      Přeplatek <strong>{formatCzk(minor)}</strong>. O naložení s přeplatkem se domluvte s
      organizátorem. Další platba není potřeba.
    </p>
  )
}
