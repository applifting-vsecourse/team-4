import { QrCode } from "lucide-react"

import { Separator } from "@/components/ui/separator"

// Participant e-mails (F45-1). Design only: amounts arrive formatted in CZK.
// The block depends on the balance alone: a debt shows the bank details and the
// payment QR, zero debt says it is paid, an overpayment asks for no payment.

export type EmailPaymentSummaryProps = {
  /** The payment this e-mail is about; omitted for changes that record none. */
  recorded?: { amount: string; date: string }
  /** All payments received so far. */
  received: string
  balance: { kind: "debt" | "settled" | "overpaid"; amount: string }
  /** Required for a debt; `reminderDate` only when one exists. */
  bank?: { account: string; variableSymbol: string; reminderDate?: string }
}

const BALANCE_LABELS = {
  debt: "Zbývá uhradit",
  settled: "Zbývá uhradit",
  overpaid: "Přeplatek",
} as const

function Row({
  label,
  value,
  isStrong = false,
}: {
  label: string
  value: string
  isStrong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={isStrong ? "text-sm font-semibold" : "text-sm"}>{value}</dd>
    </div>
  )
}

export function EmailPaymentSummary({
  recorded,
  received,
  balance,
  bank,
}: EmailPaymentSummaryProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-h4">Platby</h2>
      <dl>
        {recorded ? (
          <>
            <Row
              label="Přijatá platba"
              value={recorded.amount}
              isStrong
            />
            <Row
              label="Datum platby"
              value={recorded.date}
            />
          </>
        ) : null}
        <Row
          label="Celkem přijato"
          value={received}
        />
        <Row
          label={BALANCE_LABELS[balance.kind]}
          value={balance.amount}
          isStrong
        />
      </dl>
      {balance.kind === "settled" ? <p className="text-sm">Vše je uhrazeno.</p> : null}
      {balance.kind === "debt" && bank ? (
        <>
          <Separator />
          <h3 className="pt-2 text-base font-medium">Platební údaje</h3>
          <dl>
            <Row
              label="Číslo účtu"
              value={bank.account}
            />
            <Row
              label="Variabilní symbol"
              value={bank.variableSymbol}
            />
            {bank.reminderDate ? (
              <Row
                label="Datum připomenutí platby"
                value={bank.reminderDate}
              />
            ) : null}
          </dl>
          <div className="flex size-40 items-center justify-center rounded-lg border border-border bg-card">
            <QrCode
              role="img"
              aria-label="QR kód pro platbu"
              className="size-28"
            />
          </div>
        </>
      ) : null}
      {balance.kind === "overpaid" ? (
        <p className="text-sm">O naložení s přeplatkem se domluvte s organizátorem.</p>
      ) : null}
    </section>
  )
}
