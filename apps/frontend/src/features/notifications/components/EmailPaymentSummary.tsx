import { Separator } from "@/components/ui/separator"

// Participant e-mails (F45-1). Design only: amounts arrive formatted in CZK.
// Bank details appear only while a debt remains.

export type EmailPaymentSummaryProps = {
  /** The payment this e-mail is about; omitted for changes that record none. */
  recorded?: { amount: string; date: string; source: "manual" | "simulated" }
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
              label={recorded.source === "simulated" ? "Simulovaná platba" : "Zaznamenaná platba"}
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
        </>
      ) : null}
    </section>
  )
}
