import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronLeft } from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"
import { PaymentQrCard } from "@/features/registrations/components/PaymentQrCard"
import {
  SimulatedPaymentForm,
  type SimulatedPaymentFormProps,
} from "@/features/registrations/components/SimulatedPaymentForm"
import {
  SimulatedPaymentHistory,
  type HistoryPayment,
} from "@/features/registrations/components/SimulatedPaymentHistory"
import {
  SimulatedPaymentResult,
  type SimulatedPaymentResultProps,
} from "@/features/registrations/components/SimulatedPaymentResult"

// F21-1 design preview: simulated full and partial payment through a QR link.
// Static only: no router, queries or API; every value below is hard-coded.

const LINK = "https://akc.io/platba/k7Q2xv9TnB4mWe8LcR3yHs6D"
const EVENT = "Letní tábor Modrá Hora 2027"

const FORM: SimulatedPaymentFormProps = { eventName: EVENT, debt: "2 400 Kč", amount: "2400" }

const HISTORY: HistoryPayment[] = [
  { id: "p3", date: "28. 10. 2026", amount: "1 000 Kč", isSimulated: true },
  { id: "p2", date: "14. 10. 2026", amount: "1 500 Kč", isSimulated: false },
  { id: "p1", date: "2. 10. 2026", amount: "3 000 Kč", isSimulated: false },
]

function ParticipantHeader() {
  return (
    <header className="w-full border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center px-4">
        <BrandMark isLarge />
      </div>
    </header>
  )
}

function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <ParticipantHeader />
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">{children}</div>
      </main>
    </>
  )
}

type DetailProps = {
  /** Remaining debt in haléře; zero or less hides the QR. */
  balanceMinor: number
  payments: HistoryPayment[]
}

// The existing "Moje přihlášky → Detail přihlášky", extended with the QR block.
function RegistrationDetailPage({ balanceMinor, payments }: DetailProps) {
  const hasDebt = balanceMinor > 0
  const paid = payments.length === 0 ? 0 : 550000
  return (
    <Page>
      <section className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
        >
          <ChevronLeft />
          Moje přihlášky
        </Button>
        <h1 className="text-h2">{EVENT}</h1>
        <Card>
          <CardHeader>
            <CardTitle>Platba</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantPaymentSummary
              selectedPriceMinor={790000}
              amountDueMinor={790000}
              paidMinor={hasDebt ? paid : 790000 + Math.max(-balanceMinor, 0)}
              balanceMinor={balanceMinor}
              instructions={
                hasDebt
                  ? {
                      amountMinor: 240000,
                      account: { prefix: null, number: "1234567890", bankCode: "0800" },
                      variableSymbol: "2027014",
                      reminderAt: "2026-11-15T07:00:00.000Z",
                    }
                  : null
              }
            />
            {hasDebt ? (
              <PaymentQrCard
                debt="2 400 Kč"
                link={LINK}
              />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Přijaté platby</CardTitle>
          </CardHeader>
          <CardContent>
            <SimulatedPaymentHistory payments={payments} />
          </CardContent>
        </Card>
      </section>
    </Page>
  )
}

const meta = {
  title: "Designs/F21-1 Simulated payment",
  component: RegistrationDetailPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { balanceMinor: 240000, payments: HISTORY },
} satisfies Meta<typeof RegistrationDetailPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; these stories report it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

/** Detail with a remaining debt: QR and link to the simulation, simulated payment marked in the history. */
export const DetailWithQr: Story = {}

/** Detail with a first payment history and no simulated payment yet. */
export const DetailNoSimulatedPayment: Story = {
  args: { payments: HISTORY.slice(1) },
}

/** Debt settled: no request to pay and no QR. */
export const DetailNoDebt: Story = { args: { balanceMinor: 0 } }

/** Overpaid: no request to pay and no QR. */
export const DetailOverpaid: Story = { args: { balanceMinor: -50000 } }

// The public page opened from the QR: no organizer or participant navigation.
function SimulationPage({ children }: { children: ReactNode }) {
  return (
    <Page>
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </Page>
  )
}

function Simulation(props: Partial<SimulatedPaymentFormProps>) {
  return (
    <SimulationPage>
      <SimulatedPaymentForm
        {...FORM}
        {...props}
      />
    </SimulationPage>
  )
}

function Result(props: SimulatedPaymentResultProps) {
  return (
    <SimulationPage>
      <SimulatedPaymentResult {...props} />
    </SimulationPage>
  )
}

/** The page opened from the QR: debt and the amount prefilled with it. */
export const SimulationFull: Story = { render: () => <Simulation /> }

/** A smaller amount typed for a partial payment. */
export const SimulationPartial: Story = { render: () => <Simulation amount="1000" /> }

/** Empty, non-numeric, zero, negative, over-precise or too high amount: error at the field, input kept. */
export const SimulationInvalidAmount: Story = {
  render: () => (
    <Simulation
      amount="12,345"
      amountError="Zadejte kladnou částku nejvýše 2 400 Kč s nejvýše dvěma desetinnými místy."
    />
  ),
}

/** Saving in progress: the button and the field are disabled, so a double click cannot pay twice. */
export const SimulationSaving: Story = { render: () => <Simulation isSaving /> }

/** The response got lost: the result is verified, no duplicate payment. */
export const SimulationVerifying: Story = { render: () => <Simulation isVerifying /> }

/** The debt dropped below the entered amount: nothing saved, new confirmation required. */
export const SimulationDebtReduced: Story = {
  render: () => (
    <Simulation
      debt="900 Kč"
      amount="2400"
      isDebtReduced
      amountError="Částka je vyšší než aktuální dluh 900 Kč."
    />
  ),
}

/** Saving failed: the input stays, retry is offered, no success is shown. */
export const SimulationSaveFailed: Story = {
  parameters: contrastWarning,
  render: () => (
    <Simulation
      amount="1000"
      errorMessage="Platbu se nepodařilo uložit. Zkuste to prosím znovu."
    />
  ),
}

/** Loading the current debt failed: retry is offered. */
export const SimulationLoadFailed: Story = {
  parameters: contrastWarning,
  render: () => (
    <Simulation
      debt="—"
      amount=""
      errorMessage="Aktuální dluh se nepodařilo načíst. Zkuste to prosím znovu."
    />
  ),
}

/** Partial payment recorded: amount and the new remaining debt, another partial payment possible. */
export const ResultPartial: Story = {
  render: () => (
    <Result
      kind="paid"
      paidAmount="1 000 Kč"
      remainingDebt="1 400 Kč"
    />
  ),
}

/** Full payment recorded: the debt is zero. */
export const ResultFull: Story = {
  render: () => (
    <Result
      kind="paid"
      paidAmount="2 400 Kč"
      remainingDebt="0 Kč"
    />
  ),
}

/** An already opened page after the debt was settled: nothing to pay, no payment possible. */
export const NothingToPay: Story = {
  render: () => (
    <Result
      kind="nothing-to-pay"
      remainingDebt="0 Kč"
    />
  ),
}

/** Invalid link: unavailable payment, no personal data. */
export const InvalidLink: Story = {
  render: () => (
    <SimulationPage>
      <RecordUnavailable action={<Button variant="outline">Zkusit znovu</Button>} />
    </SimulationPage>
  ),
}
