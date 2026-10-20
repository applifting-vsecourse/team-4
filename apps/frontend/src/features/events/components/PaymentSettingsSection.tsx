import { useState } from "react"
import { Info, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { type PaymentSettings } from "@/features/events/api/paymentSettingsSchemas"
import {
  PaymentSettingsForm,
  toFormValues,
  type PaymentFieldError,
} from "@/features/events/components/PaymentSettingsForm"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import { useUpdatePaymentSettings } from "@/features/events/hooks/useUpdatePaymentSettings"
import { readApiError } from "@/features/events/lib/apiError"

const FIELDS: PaymentFieldError["field"][] = [
  "bankAccountPrefix",
  "bankAccountNumber",
  "bankCode",
  "paymentDueDays",
]

type PaymentSettingsSectionProps = {
  organizationId: string
  event: EventDetail
}

// Payment card of the event settings (S2-09). Unlike the terms it stays
// editable after registration has been opened.
export function PaymentSettingsSection({ organizationId, event }: PaymentSettingsSectionProps) {
  const update = useUpdatePaymentSettings(organizationId, event.id)
  const refreshEvent = useRefreshEvent(organizationId, event.id)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<PaymentFieldError | null>(null)
  // Captured once: a refetch must not overwrite what the organizer is typing.
  const [initialValues] = useState(() => toFormValues(event.paymentSettings))

  const handleSubmit = async (settings: PaymentSettings) => {
    setErrorMessage(null)
    setFieldError(null)
    try {
      await update.mutateAsync(settings)
      toast.success("Platební nastavení bylo uloženo.")
    } catch (error) {
      const apiError = await readApiError(error)
      const field = FIELDS.find((name) => name === apiError.field)
      if (apiError.status === 400 && field && apiError.message) {
        setFieldError({ field, message: apiError.message })
      } else if (apiError.status === 404) {
        await refreshEvent()
        setErrorMessage("Záznam není dostupný.")
      } else {
        setErrorMessage("Platební nastavení se nepodařilo uložit. Zkuste to prosím znovu.")
      }
    }
  }

  return (
    <section
      aria-labelledby="payments-heading"
      className="mt-8"
    >
      <h2
        id="payments-heading"
        className="mb-4 text-h4"
      >
        Platby
      </h2>
      <Card>
        <CardContent className="space-y-4">
          {event.paymentSettings === null ? (
            <Alert>
              <TriangleAlert />
              <AlertTitle>Platební nastavení chybí</AlertTitle>
              <AlertDescription>
                Bez platebního nastavení nelze otevřít přihlašování.
              </AlertDescription>
            </Alert>
          ) : null}
          <Alert>
            <Info />
            <AlertDescription>
              Změna platí jen pro nové přihlášky. Přihlášky, které už akce přijala, si ponechávají
              původní účet a splatnost.
            </AlertDescription>
          </Alert>
          <PaymentSettingsForm
            initialValues={initialValues}
            isLoading={update.isPending}
            errorMessage={errorMessage}
            fieldError={fieldError}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </section>
  )
}
