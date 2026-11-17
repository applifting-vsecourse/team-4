import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link2 } from "lucide-react"
import { toast } from "sonner"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Money } from "@/components/Money"
import { Notice } from "@/components/Notice"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { readApiError } from "@/lib/apiError"
import { formatCalendarDate } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { registrationOptionsQueryOptions } from "@/features/payments/api/paymentQueryOptions"
import type { BankTransaction, ManualPairing } from "@/features/payments/api/paymentSchemas"
import { PairTransactionForm } from "@/features/payments/components/PairTransactionForm"
import { usePairTransaction } from "@/features/payments/hooks/usePairTransaction"

const FAILED = "Transakci se nepodařilo přiřadit. Zkuste to prosím znovu."

const ALREADY_PAIRED = "Transakce už je přiřazená k přihlášce."

type Failure = { message: string; kind: "registration" | "alreadyPaired" | "other" }

/** The server's message for a refused pairing; a generic one for a lost request. */
export const pairingFailure = (error: unknown): Failure => {
  const { code, message } = readApiError(error)
  if (code === "registration_unavailable") {
    return { message: message ?? "Vyberte přihlášku této akce.", kind: "registration" }
  }
  if (code === "transaction_already_paired") {
    return { message: message ?? ALREADY_PAIRED, kind: "alreadyPaired" }
  }
  return { message: FAILED, kind: "other" }
}

type PairTransactionDialogProps = {
  organizationId: string
  eventId: string
  transaction: BankTransaction
  /** After a successful pairing: the payments overview has a new payment. */
  onPaired?: () => void
}

// „Přiřadit“ of an unpaired transaction (F24): the organizer picks a
// registration of the same event and says why. The form is mounted only
// while the dialog is open, so it starts empty every time; a failed save
// keeps the dialog and the values. A transaction paired meanwhile (another
// tab, an import) leaves the queue: the dialog closes and says so.
export function PairTransactionDialog({
  organizationId,
  eventId,
  transaction,
  onPaired,
}: PairTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  // Set synchronously: a fast double click can outrun `isPending`.
  const isSending = useRef(false)
  const pair = usePairTransaction(organizationId, eventId, transaction.id)
  const options = useQuery({
    ...registrationOptionsQueryOptions(organizationId, eventId),
    enabled: isOpen,
  })

  const handleOpenChange = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen)
    setFailure(null)
  }

  const handleSubmit = async (pairing: ManualPairing) => {
    if (isSending.current) return
    isSending.current = true
    setFailure(null)
    try {
      await pair.mutateAsync(pairing)
      const registration = options.data?.find((option) => option.id === pairing.registrationId)
      setIsOpen(false)
      // Plain colours, as in TermDialog: the rich success colours fail the
      // contrast check.
      toast.success(
        registration
          ? `Transakce přiřazena k přihlášce ${registration.firstName} ${registration.lastName}`
          : "Transakce přiřazena",
        { richColors: false },
      )
      onPaired?.()
    } catch (error) {
      const refusal = pairingFailure(error)
      if (refusal.kind === "alreadyPaired") {
        setIsOpen(false)
        toast.error(refusal.message, { richColors: false })
        onPaired?.()
      } else {
        setFailure(refusal)
      }
    } finally {
      isSending.current = false
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Přiřadit transakci ${formatCzk(transaction.amountMinor)} z ${formatCalendarDate(transaction.bookedOn)}`}
        >
          <Link2 />
          Přiřadit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přiřadit transakci</DialogTitle>
          <DialogDescription className="sr-only">
            Vyberte přihlášku této akce a uveďte důvod. Částka se připíše jako přijatá platba.
          </DialogDescription>
        </DialogHeader>
        <DefinitionList>
          <DefinitionRow label="Datum">{formatCalendarDate(transaction.bookedOn)}</DefinitionRow>
          <DefinitionRow label="Částka">
            <Money minor={transaction.amountMinor} />
          </DefinitionRow>
          <DefinitionRow label="Variabilní symbol">
            <span className="font-mono tabular-nums">{transaction.variableSymbol ?? "—"}</span>
          </DefinitionRow>
          {transaction.counterpartyName ? (
            <DefinitionRow label="Odesílatel">{transaction.counterpartyName}</DefinitionRow>
          ) : null}
          {transaction.message ? (
            <DefinitionRow label="Zpráva">{transaction.message}</DefinitionRow>
          ) : null}
        </DefinitionList>
        {options.data ? (
          options.data.length === 0 ? (
            <Notice
              tone="info"
              title="Akce zatím nemá žádné přihlášky, transakci není k čemu přiřadit."
            />
          ) : (
            <PairTransactionForm
              options={options.data}
              isLoading={pair.isPending}
              errorMessage={failure?.kind === "other" ? failure.message : undefined}
              registrationError={failure?.kind === "registration" ? failure.message : undefined}
              onSubmit={(pairing) => void handleSubmit(pairing)}
            />
          )
        ) : options.isError ? (
          <LoadError
            title="Přihlášky se nepodařilo načíst"
            isRetrying={options.isFetching}
            onRetry={() => options.refetch()}
          />
        ) : (
          <LoadingBlock
            label="Načítání přihlášek"
            className="space-y-2"
          >
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </LoadingBlock>
        )}
      </DialogContent>
    </Dialog>
  )
}
