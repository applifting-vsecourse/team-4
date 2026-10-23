import { useRef, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatCzk } from "@/lib/money"

import { RecordPaymentForm } from "@/features/registrations/components/RecordPaymentForm"
import { useRecordPayment } from "@/features/registrations/hooks/useRecordPayment"
import {
  describePaymentError,
  type PaymentSaveError,
} from "@/features/registrations/lib/paymentErrors"

type RecordPaymentDialogProps = {
  organizationId: string
  eventId: string
  registrationId: string
}

// "Zaznamenat platbu" in the registration detail (S2-12). The form is mounted
// only while the dialog is open, so it starts empty every time. A failed save
// keeps the dialog and the values. The submission key belongs to the content:
// a retry of the same values reuses it, so a double click or a repeat after a
// lost answer records one payment; changed values get a new key. Reopening the
// dialog starts a new payment.
export function RecordPaymentDialog({
  organizationId,
  eventId,
  registrationId,
}: RecordPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [failure, setFailure] = useState<PaymentSaveError | null>(null)
  const attempt = useRef<{ content: string; key: string } | null>(null)
  // Set synchronously: `isPending` only changes after a re-render, which a
  // fast double click can outrun.
  const isSending = useRef(false)
  const record = useRecordPayment(organizationId, eventId, registrationId)

  const handleOpenChange = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen)
    setFailure(null)
    attempt.current = null
  }

  const handleSubmit = async (values: { amountMinor: number; receivedOn: string }) => {
    if (isSending.current) return
    isSending.current = true
    setFailure(null)
    const content = `${values.amountMinor}|${values.receivedOn}`
    if (attempt.current?.content !== content) {
      attempt.current = { content, key: crypto.randomUUID() }
    }
    try {
      await record.mutateAsync({ submissionKey: attempt.current.key, ...values })
      // The key stays until the dialog is reopened, so a late repeat of this
      // click is the same payment and not a new one.
      setIsOpen(false)
      toast.success(`Platba ${formatCzk(values.amountMinor)} zaznamenána`)
    } catch (error) {
      setFailure(describePaymentError(error))
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
        <Button>
          <Plus />
          Zaznamenat platbu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zaznamenat platbu</DialogTitle>
          <DialogDescription className="sr-only">
            Částka v korunách a datum, kdy peníze přišly. Zapsanou platbu nelze změnit.
          </DialogDescription>
        </DialogHeader>
        <RecordPaymentForm
          isLoading={record.isPending}
          errorMessage={failure?.field ? undefined : failure?.message}
          fieldError={
            failure?.field ? { field: failure.field, message: failure.message } : undefined
          }
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
