import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { readApiError } from "@/lib/apiError"
import { formatCzk, minorToInput } from "@/lib/money"

import { qrPaymentPageQueryOptions } from "@/features/registrations/api/qrPaymentQueryOptions"
import { type QrPaymentResult } from "@/features/registrations/api/qrPaymentSchemas"
import { SimulatedPaymentForm } from "@/features/registrations/components/SimulatedPaymentForm"
import { SimulatedPaymentResult } from "@/features/registrations/components/SimulatedPaymentResult"
import { useQrPayment } from "@/features/registrations/hooks/useQrPayment"
import { parseQrAmount } from "@/features/registrations/lib/qrPayment"

const SAVE_FAILED = "Platbu se nepodařilo dokončit. Zkuste to prosím znovu."
const LOAD_FAILED = "Částku k úhradě se nepodařilo načíst. Zkuste to prosím znovu."

type QrPaymentProps = { token: string }

// The page opened from the QR (F21-1). Opening it records nothing; "Zaplatit"
// records one payment. The amount and the debt are checked again by the server.
function QrPaymentFlow({ token }: QrPaymentProps) {
  const query = useQuery(qrPaymentPageQueryOptions(token))
  const payment = useQrPayment(token)

  // Edited by the visitor; until then it follows the current debt.
  const [typedAmount, setTypedAmount] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string>()
  const [isDebtReduced, setIsDebtReduced] = useState(false)
  const [paid, setPaid] = useState<QrPaymentResult | null>(null)
  // One key per attempt at one amount: a retry after a lost response repeats
  // it, so the server answers with the saved payment instead of a second one.
  const attempt = useRef<{ amount: string; key: string } | null>(null)

  const page = query.data

  if (query.isPending) {
    return (
      <div
        className="space-y-4"
        role="status"
        aria-label="Načítání platby"
      >
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!page) {
    if (readApiError(query.error).status === 404) {
      return <RecordUnavailable action={null} />
    }
    return (
      <SimulatedPaymentForm
        eventName=""
        amount=""
        errorMessage={LOAD_FAILED}
        isSaving={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const debt = Math.max(page.balanceMinor, 0)
  const isSettled = page.balanceMinor <= 0

  if (paid) {
    return (
      <SimulatedPaymentResult
        kind="paid"
        paidAmount={formatCzk(paid.paidMinor)}
        remainingDebt={formatCzk(Math.max(paid.balanceMinor, 0))}
        isSettled={paid.balanceMinor <= 0}
        onPayMore={() => {
          setPaid(null)
          setTypedAmount(null)
          void query.refetch()
        }}
      />
    )
  }

  if (isSettled) {
    return (
      <SimulatedPaymentResult
        kind="nothing-to-pay"
        remainingDebt={formatCzk(0)}
        isSettled
      />
    )
  }

  const amount = typedAmount ?? minorToInput(debt)

  const submit = () => {
    const parsed = parseQrAmount(amount, debt)
    if (parsed.error !== undefined) {
      setAmountError(parsed.error)
      return
    }
    setAmountError(undefined)
    setIsDebtReduced(false)
    if (attempt.current?.amount !== amount) {
      attempt.current = { amount, key: crypto.randomUUID() }
    }
    payment.mutate(
      { submissionKey: attempt.current.key, amountMinor: parsed.minor },
      {
        onSuccess: (result) => {
          attempt.current = null
          setPaid(result)
        },
        onError: (error) => {
          const { status, code } = readApiError(error)
          if (status === 409 && (code === "debt_reduced" || code === "nothing_to_pay")) {
            // Nothing was saved: the page now shows the current debt and asks again.
            attempt.current = null
            setIsDebtReduced(code === "debt_reduced")
            setTypedAmount(amount)
          }
        },
      },
    )
  }

  // A refused amount is explained at the field; anything else, including a
  // lost response, is a failure the visitor can retry.
  const { code: failureCode } = readApiError(payment.error)
  const hasSaveFailed =
    payment.isError && failureCode !== "debt_reduced" && failureCode !== "nothing_to_pay"

  return (
    <SimulatedPaymentForm
      eventName={page.eventName}
      debt={formatCzk(debt)}
      amount={amount}
      amountError={amountError ?? (isDebtReduced ? parseQrAmount(amount, debt).error : undefined)}
      isDebtReduced={isDebtReduced}
      errorMessage={hasSaveFailed ? SAVE_FAILED : undefined}
      isSaving={payment.isPending}
      onAmountChange={(next) => {
        setTypedAmount(next)
        setAmountError(undefined)
        setIsDebtReduced(false)
        payment.reset()
      }}
      onSubmit={submit}
      onRetry={submit}
    />
  )
}

// The page opened from the QR (F21-1) with the way back to the registration.
// The detail asks for a magic link when the visitor has no session, so the
// payment link itself still opens nothing private.
export function QrPayment({ token }: QrPaymentProps) {
  // The same query as the flow below: one request, shared through the cache.
  const { data: page } = useQuery(qrPaymentPageQueryOptions(token))

  return (
    <div className="space-y-6">
      {page ? (
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link
            to={ROUTES.myRegistration}
            params={{ registrationId: page.registrationId }}
          >
            <ChevronLeft />
            Zpět na přihlášku
          </Link>
        </Button>
      ) : null}
      <QrPaymentFlow token={token} />
    </div>
  )
}
