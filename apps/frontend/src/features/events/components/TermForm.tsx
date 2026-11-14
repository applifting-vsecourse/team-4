import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { parseCzkToMinor } from "@/lib/money"

import { type TermInput } from "@/features/events/api/eventSchemas"

const schema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Vyplňte označení.")
      .max(100, "Označení může mít nejvýše 100 znaků."),
    startDate: z.string().min(1, "Vyberte datum začátku."),
    endDate: z.string().min(1, "Vyberte datum konce."),
    price: z.string(),
  })
  .superRefine((values, context) => {
    const price = parseCzkToMinor(values.price)
    if (price.error !== undefined) {
      context.addIssue({ code: "custom", path: ["price"], message: price.error })
    }
    // Both days belong to the term, so the same day is a valid one-day term.
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Konec nesmí být před začátkem.",
      })
    }
  })

export type TermFormValues = z.infer<typeof schema>

export type TermFieldError = { field: "startDate" | "endDate"; message: string }

type TermFormProps = {
  initialValues: TermFormValues
  isLoading: boolean
  errorMessage?: string | null
  /** Server-side rejection (overlap, dates) shown at its field. */
  fieldError?: TermFieldError | null
  /** Days taken by the event's other terms, marked in the date pickers. */
  occupiedRanges?: { from: string; to: string }[]
  onSubmit: (input: TermInput) => void | Promise<void>
}

// Names every reason a day is marked, e.g. "Červeně: obsazené jiným termínem, před začátkem termínu".
const legend = (reasons: (string | null)[]) => `Červeně: ${reasons.filter(Boolean).join(", ")}`

// Adding and editing a term share this form. It has no capacity input:
// capacity comes from rooms and beds (S2-05).
export function TermForm({
  initialValues,
  isLoading,
  errorMessage,
  fieldError,
  occupiedRanges,
  onSubmit,
}: TermFormProps) {
  const form = useForm<TermFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  const { setError } = form
  const [startDate, endDate] = form.watch(["startDate", "endDate"])
  const hasOccupied = (occupiedRanges?.length ?? 0) > 0
  const taken = hasOccupied ? "obsazené jiným termínem" : null

  useEffect(() => {
    if (fieldError) {
      setError(fieldError.field, { type: "server", message: fieldError.message })
    }
  }, [fieldError, setError])

  const submit = (values: TermFormValues) =>
    onSubmit({
      label: values.label,
      startDate: values.startDate,
      endDate: values.endDate,
      // Validated by the schema above.
      priceMinor: parseCzkToMinor(values.price).minor ?? 0,
    })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="space-y-4"
      >
        {errorMessage ? <FormError message={errorMessage} /> : null}

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Označení</FormLabel>
              <FormControl>
                <Input
                  placeholder="např. 2. turnus"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Začátek</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={field.disabled}
                    ref={field.ref}
                    markedRanges={occupiedRanges}
                    markedAfter={endDate || undefined}
                    markedLegend={legend([taken, endDate ? "po konci termínu" : null])}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Konec</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={field.disabled}
                    ref={field.ref}
                    markedRanges={occupiedRanges}
                    markedBefore={startDate || undefined}
                    markedLegend={legend([taken, startDate ? "před začátkem termínu" : null])}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cena (Kč)</FormLabel>
              <FormControl>
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  {...field}
                />
              </FormControl>
              <FormDescription>Může být i 0 Kč.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
            >
              Zrušit
            </Button>
          </DialogClose>
          <PendingButton
            type="submit"
            isPending={isLoading}
          >
            Uložit termín
          </PendingButton>
        </DialogFooter>
      </form>
    </Form>
  )
}
