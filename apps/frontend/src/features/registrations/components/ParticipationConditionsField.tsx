import { useState } from "react"
import { type Control } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

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

  return (
    <section
      aria-labelledby="registration-conditions-heading"
      className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="registration-conditions-heading"
          className="text-h4"
        >
          Podmínky účasti
        </h2>
        <Badge variant="outline">Povinné</Badge>
      </div>

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
          >
            {isOpen ? "Skrýt podmínky" : "Zobrazit podmínky"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="mt-3 rounded-md bg-muted p-3 text-sm break-words whitespace-pre-line">
            {conditions}
          </p>
        </CollapsibleContent>
      </Collapsible>

      <FormField
        control={control}
        name="conditionsConfirmed"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-start gap-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <FormLabel className="min-w-0 flex-1 break-words">
                Potvrzuji, že jsem si přečetl/a podmínky účasti
              </FormLabel>
            </div>
            <FormMessage className="min-h-0" />
          </FormItem>
        )}
      />
    </section>
  )
}
