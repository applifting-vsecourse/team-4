import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"

export type AnswerSelectionOption = {
  value: string
  label: string
}

/** A compact, accessible disclosure for selecting answers with one shared layout. */
export function AnswerSelectionDisclosure({
  id,
  title,
  summary,
  options,
  selectedValues,
  explanation,
  onSelectionChange,
}: {
  id: string
  title: string
  summary: string
  options: AnswerSelectionOption[]
  selectedValues: readonly string[]
  explanation: string
  onSelectionChange: (value: string, selected: boolean) => void
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="group h-auto min-h-10 w-full justify-between text-left whitespace-normal"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">{title}</span>
            <span className="block text-xs font-normal break-words text-muted-foreground">
              {summary}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 px-2 pt-2">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {options.map(({ value, label }) => {
              const checkboxId = `${id}-${value}`
              return (
                <Field
                  key={value}
                  orientation="horizontal"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={selectedValues.includes(value)}
                    onCheckedChange={(checked) => onSelectionChange(value, checked === true)}
                  />
                  <FieldLabel htmlFor={checkboxId}>{label}</FieldLabel>
                </Field>
              )
            })}
          </div>
          <FieldDescription>{explanation}</FieldDescription>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
