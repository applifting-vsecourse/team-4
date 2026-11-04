import type { Meta, StoryObj } from "@storybook/react-vite"
import { CircleCheck } from "lucide-react"

import { PublicShell } from "@/components/PublicShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { type PaymentInstructions } from "@/features/registrations/api/registrationSchemas"
import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"
import {
  ParticipantTermStates,
  type ParticipantTermStatesItem,
} from "@/features/registrations/components/ParticipantTermStates"
import { PaymentQrCard } from "@/features/registrations/components/PaymentQrCard"

// Design of the participant's side of the evaluation (F13-1, F14-1): a new
// registration waits for the organizer in every term and owes nothing; after
// a decision each term has its own state and only confirmed terms are paid.
// Static only: no API; every value is hard-coded.

const EVENT = "Letní tábor Lipnice 2027"

const SUBMITTED: ParticipantTermStatesItem[] = [
  { id: "turnus-1", label: "1. turnus", details: "4.–11. 7. 2027 · 4 800 Kč", state: "pending" },
  { id: "turnus-2", label: "2. turnus", details: "11.–18. 7. 2027 · 4 800 Kč", state: "pending" },
]

const DECIDED: ParticipantTermStatesItem[] = [
  { id: "turnus-1", label: "1. turnus", details: "4.–11. 7. 2027 · 4 800 Kč", state: "confirmed" },
  { id: "turnus-2", label: "2. turnus", details: "11.–18. 7. 2027 · 4 800 Kč", state: "pending" },
  {
    id: "turnus-3",
    label: "3. turnus",
    details: "18.–25. 7. 2027 · 4 800 Kč",
    state: "waitlisted",
  },
]

const INSTRUCTIONS: PaymentInstructions = {
  amountMinor: 480_000,
  variableSymbol: "2027004815",
  account: { prefix: null, number: "2101234567", bankCode: "2010" },
  reminderAt: "2027-03-19T00:00:00.000Z",
}

function Submitted() {
  return (
    <PublicShell>
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
            <h1
              id="registration-result-heading"
              className="text-h3"
            >
              Přihláška je uložená
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tereza Nováková, tereza.novakova@seznam.cz. Přijato 3. 3. 2027 9:14 (Europe/Prague).
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-h4">{EVENT}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ParticipantTermStates terms={SUBMITTED} />
              <div className="border-t border-border pt-4">
                <ParticipantPaymentSummary
                  selectedPriceMinor={960_000}
                  amountDueMinor={0}
                  paidMinor={0}
                  balanceMinor={0}
                  instructions={null}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  )
}

function Decided() {
  return (
    <PublicShell>
      <div className="space-y-6">
        <h1 className="text-h3">{EVENT}</h1>
        <Card>
          <CardHeader>
            <CardTitle>Termíny</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantTermStates terms={DECIDED} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platba</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantPaymentSummary
              selectedPriceMinor={1_440_000}
              amountDueMinor={480_000}
              paidMinor={0}
              balanceMinor={480_000}
              instructions={INSTRUCTIONS}
            />
            <PaymentQrCard link="https://akc.io/p/7Hq2xL9mVw" />
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  )
}

const meta = {
  title: "Designs/F13-1 F14-1 Participant registration",
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

/** Right after submitting: every term waits for the organizer, nothing to pay, no QR. */
export const SubmittedPending: Story = { render: () => <Submitted /> }

/** Moje přihlášky → detail: confirmed, pending and waitlisted terms; only the confirmed one is paid. */
export const DecidedTerms: Story = { render: () => <Decided /> }
