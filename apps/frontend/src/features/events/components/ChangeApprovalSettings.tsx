import { useState, type FormEvent } from "react"

import { FormError } from "@/components/FormError"
import { Notice } from "@/components/Notice"
import { PendingButton } from "@/components/PendingButton"
import { Card, CardContent } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type ChangeApprovalSettingsProps = {
  /**
   * The saved setting in words, e.g. "Schvalujete změny přihlášek od 14 dnů před začátkem termínu",
   * or "Žádné změny přihlášek nepodléhají vašemu schválení" when nothing is set.
   */
  savedSetting: string
  /** The entered number of days; empty by default, which means no approval is required. */
  days?: string
  daysError?: string
  errorMessage?: string
  isSaving?: boolean
  /** Called with the entered text; the owner validates it. Absent in the design preview. */
  onSubmit?: (days: string) => void
}

// Správa akce → Nastavení: the number of days before each term's start
// from which the organizer approves registration changes.
export function ChangeApprovalSettings({
  savedSetting,
  days = "",
  daysError,
  errorMessage,
  isSaving = false,
  onSubmit,
}: ChangeApprovalSettingsProps) {
  const [value, setValue] = useState(days)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.(value)
  }

  return (
    <CollapsibleSection
      headingId="change-approval-heading"
      title="Schvalování změn přihlášek"
    >
      <Card>
        <CardContent>
          <Notice
            tone="info"
            title={savedSetting}
          />

          <form
            noValidate
            className="mt-4 space-y-4"
            onSubmit={handleSubmit}
          >
            <Field
              className="sm:max-w-sm"
              data-invalid={daysError ? true : undefined}
            >
              <FieldLabel htmlFor="change-approval-days">
                Počet dní před začátkem termínu
              </FieldLabel>
              <Input
                id="change-approval-days"
                inputMode="numeric"
                autoComplete="off"
                placeholder="např. 14"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={daysError ? true : undefined}
              />
              {daysError ? <FieldError>{daysError}</FieldError> : null}
            </Field>

            {errorMessage ? (
              <FormError
                title="Uložení se nezdařilo"
                message={errorMessage}
              />
            ) : null}

            <div className="flex justify-end">
              <PendingButton
                type="submit"
                isPending={isSaving}
              >
                Uložit schvalování změn
              </PendingButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </CollapsibleSection>
  )
}
