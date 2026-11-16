import { useState } from "react"
import { type Control } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"

import { type RegistrationFormValues } from "@/features/registrations/components/RegistrationForm"

type ParticipationConditionsFieldProps = {
  control: Control<RegistrationFormValues>
  /** The event's participation terms, possibly with cancellation information. */
  conditions: string
}

// The read-confirmation of the event's participation terms (F07). Showing the
// text is optional and independent of the checkbox; nothing is recorded beyond
// the submit being accepted.
export function ParticipationConditionsField({
  control,
  conditions,
}: ParticipationConditionsFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const id = "registration-conditions-confirmed"
  const textId = "registration-conditions-text"

  return (
    <section
      aria-labelledby="registration-conditions-heading"
      className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6"
    >
      <h2
        id="registration-conditions-heading"
        className="text-h4"
      >
        Podmínky účasti
      </h2>

      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="-ml-3"
            aria-controls={textId}
          >
            {isOpen ? "Skrýt podmínky" : "Zobrazit podmínky"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent id={textId}>
          <p className="mt-3 rounded-md bg-muted p-3 text-sm break-words whitespace-pre-line">
            {conditions}
          </p>
        </CollapsibleContent>
      </Collapsible>

      <FormField
        control={control}
        name="conditionsConfirmed"
        render={({ field, fieldState }) => (
          <FormItem>
            <div className="flex items-start gap-3">
              <Checkbox
                id={id}
                aria-invalid={fieldState.error ? true : undefined}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <Label
                htmlFor={id}
                className="min-w-0 flex-1 break-words"
              >
                Potvrzuji, že jsem si přečetl/a podmínky účasti
              </Label>
            </div>
            <FormMessage className="min-h-0" />
          </FormItem>
        )}
      />
    </section>
  )
}
