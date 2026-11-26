import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { CircleAlert, CircleCheck, CircleX, Clock, type LucideIcon } from "lucide-react"

import { ROUTES, SECTIONS } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCzk } from "@/lib/money"
import { cn } from "@/lib/utils"

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4">
              <StatusLine
                icon={CircleAlert}
                tone="text-destructive"
              >
                <span>Zbývá zaplatit</span>
                <BalanceAmount
                  amount={formatCzk(overview.remainingMinor)}
                  isSettled={false}
                />
              </StatusLine>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
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
          <div className="space-y-2 text-sm">{describe(overview)}</div>
        </CardContent>
      </Card>
    </section>
  )
}

// Every status leads with the same large icon and text; the colour carries the
// meaning: green settled, red a debt, neutral waiting or cancelled.
function StatusLine({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon
  tone: string
  children: ReactNode
}) {
  return (
    <p className={cn("flex items-center gap-2 text-lg leading-none font-semibold", tone)}>
      <Icon
        aria-hidden
        className="size-5 shrink-0"
      />
      {children}
    </p>
  )
}

function describe(overview: ReturnType<typeof paymentOverview>) {
  if (overview.kind === "cancelled") {
    return (
      <>
        <StatusLine
          icon={CircleX}
          tone="text-muted-foreground"
        >
          Účast zrušena
        </StatusLine>
        {overview.overpaidMinor > 0 ? <Overpayment minor={overview.overpaidMinor} /> : null}
      </>
    )
  }
  if (overview.kind === "preliminary") {
    return (
      <>
        <StatusLine
          icon={Clock}
          tone="text-foreground"
        >
          Předběžná cena vybraných termínů {formatCzk(overview.priceMinor)}
        </StatusLine>
        <p className="text-muted-foreground">
          {overview.priceMinor === 0
            ? "Účast je zdarma, po potvrzení nic neplatíte."
            : "Zatím nic neplaťte. Platit budete až za termíny, které organizátor potvrdí."}
        </p>
      </>
    )
  }
  if (overview.dueMinor === 0 && overview.paidMinor === 0) {
    return (
      <StatusLine
        icon={CircleCheck}
        tone="text-success"
      >
        Potvrzená účast je zdarma, nic neplatíte.
      </StatusLine>
    )
  }
  return (
    <>
      <StatusLine
        icon={CircleCheck}
        tone="text-success"
      >
        Zaplaceno
      </StatusLine>
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
