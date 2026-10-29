import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { todayInPrague } from "@/lib/date"

import { parsePaymentAmount } from "@/features/registrations/lib/paymentInput"

const schema = z.object({
  amount: z.string().superRefine((value, context) => {
    const parsed = parsePaymentAmount(value)
    if (parsed.error) context.addIssue({ code: "custom", message: parsed.error })
  }),
  receivedOn: z
    .string()
    .min(1, "Zadejte datum přijetí.")
    .refine((value) => value <= todayInPrague(), "Datum přijetí nesmí být v budoucnosti."),
})

export type RecordPaymentFormValues = z.infer<typeof schema>

type RecordPaymentFormProps = {
  isLoading: boolean
  errorMessage?: string
  /** A field the server refused, shown at that field. */
  fieldError?: { field: "receivedOn"; message: string }
  onSubmit: (values: { amountMinor: number; receivedOn: string }) => void
}

// Amount in CZK and the day it arrived (S2-12). Nothing is
// sent while a value is invalid, and the typed values stay after a failed save.
export function RecordPaymentForm({
  isLoading,
  errorMessage,
  fieldError,
  onSubmit,
}: RecordPaymentFormProps) {
  const form = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", receivedOn: todayInPrague() },
  })
  const { setError } = form

  useEffect(() => {
    if (fieldError) setError(fieldError.field, { type: "server", message: fieldError.message })
  }, [fieldError, setError])

  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Zaznamenat platbu"
        onSubmit={form.handleSubmit((values) => {
          const amount = parsePaymentAmount(values.amount)
          if (amount.minor !== undefined) {
            onSubmit({ amountMinor: amount.minor, receivedOn: values.receivedOn })
          }
        })}
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Přijatá částka (Kč)</FormLabel>
              <FormControl>
                <Input
                  inputMode="decimal"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="receivedOn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Datum přijetí</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={field.disabled}
                  ref={field.ref}
                />
              </FormControl>
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
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Uložit platbu
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
