import { Info, Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type ChangeApprovalSettingsProps = {
  /** The saved setting in words, e.g. "Schvalujete změny přihlášek od 14 dní před začátkem termínu". */
  savedSetting: string
  /** The entered number of days; empty means no approval. */
  days: string
  daysError?: string
  errorMessage?: string
  isSaving?: boolean
}

// Správa akce → Nastavení → Přihlašování (F35-1a): the number of days before
// each term's start from which the organizer approves registration changes.
// Placed in the existing Přihlašování card. Design only: every value is passed in.
export function ChangeApprovalSettings({
  savedSetting,
  days,
  daysError,
  errorMessage,
  isSaving = false,
}: ChangeApprovalSettingsProps) {
  return (
    <section
      aria-labelledby="change-approval-heading"
      className="space-y-4"
    >
      <h3
        id="change-approval-heading"
        className="text-sm font-medium"
      >
        Schvalování změn přihlášek
      </h3>

      <Alert>
        <Info />
        <AlertTitle>{savedSetting}</AlertTitle>
      </Alert>

      <form
        noValidate
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Field
          className="sm:max-w-sm"
          data-invalid={daysError ? true : undefined}
        >
          <FieldLabel htmlFor="change-approval-days">Počet dní před začátkem termínu</FieldLabel>
          <Input
            id="change-approval-days"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Bez schvalování"
            defaultValue={days}
            aria-invalid={daysError ? true : undefined}
          />
          {daysError ? <FieldError>{daysError}</FieldError> : null}
        </Field>

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Uložit schvalování změn
          </Button>
        </div>
      </form>
    </section>
  )
}
