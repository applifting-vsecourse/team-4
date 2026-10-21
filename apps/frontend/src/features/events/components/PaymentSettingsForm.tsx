import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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

import { type PaymentSettings } from "@/features/events/api/paymentSettingsSchemas"

// The largest value the stored 32-bit column holds; no business limit (S2-09).
const MAX_PAYMENT_REMINDER_DAYS = 2_147_483_647

// Format only: the account checksum is enforced by the server (S2-09).
const schema = z.object({
  bankAccountPrefix: z
    .string()
    .trim()
    .regex(/^[0-9]{0,6}$/, "Předčíslí tvoří nejvýše 6 číslic."),
  bankAccountNumber: z
    .string()
    .trim()
    .min(1, "Vyplňte číslo účtu.")
    .regex(/^[0-9]{2,10}$/, "Číslo účtu tvoří 2 až 10 číslic."),
  bankCode: z
    .string()
    .trim()
    .min(1, "Vyplňte kód banky.")
    .regex(/^[0-9]{4}$/, "Kód banky tvoří 4 číslice."),
  paymentReminderDays: z
    .string()
    .trim()
    .min(1, "Vyplňte počet dní do připomenutí platby.")
    .regex(/^[0-9]+$/, "Počet dní do připomenutí platby zadejte jako celé číslo.")
    .refine((value) => Number(value) >= 1, "Počet dní do připomenutí platby musí být alespoň 1.")
    .refine(
      (value) => Number(value) <= MAX_PAYMENT_REMINDER_DAYS,
      "Zadejte menší počet dní do připomenutí platby.",
    ),
})

export type PaymentSettingsFormValues = z.infer<typeof schema>

export type PaymentFieldError = { field: keyof PaymentSettingsFormValues; message: string }

export const EMPTY_PAYMENT_SETTINGS: PaymentSettingsFormValues = {
  bankAccountPrefix: "",
  bankAccountNumber: "",
  bankCode: "",
  paymentReminderDays: "",
}

export const toFormValues = (settings: PaymentSettings | null): PaymentSettingsFormValues =>
  settings
    ? {
        bankAccountPrefix: settings.bankAccountPrefix ?? "",
        bankAccountNumber: settings.bankAccountNumber,
        bankCode: settings.bankCode,
        paymentReminderDays: String(settings.paymentReminderDays),
      }
    : EMPTY_PAYMENT_SETTINGS

type PaymentSettingsFormProps = {
  initialValues: PaymentSettingsFormValues
  isLoading: boolean
  errorMessage?: string | null
  /** Server-side rejection shown at its field. */
  fieldError?: PaymentFieldError | null
  onSubmit: (settings: PaymentSettings) => void | Promise<void>
}

// The values stay filled in after a failed attempt: the form is never reset
// on error, so the organizer can fix or repeat the save.
export function PaymentSettingsForm({
  initialValues,
  isLoading,
  errorMessage,
  fieldError,
  onSubmit,
}: PaymentSettingsFormProps) {
  const form = useForm<PaymentSettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  const { setError, reset } = form
  // Without saved settings the first save is always possible (an empty form
  // then shows what is missing). With them, saving needs a change; a failed
  // save leaves the form dirty, so it can be repeated.
  const hasSavedSettings = initialValues.bankAccountNumber !== ""
  const canSave = !hasSavedSettings || form.formState.isDirty

  // Follow the persisted settings when they change. A refetch with the same
  // data keeps the key, so it never overwrites what is being typed.
  const savedKey = JSON.stringify(initialValues)
  useEffect(() => {
    reset(JSON.parse(savedKey) as PaymentSettingsFormValues)
  }, [savedKey, reset])

  useEffect(() => {
    if (fieldError) {
      setError(fieldError.field, { type: "server", message: fieldError.message })
    }
  }, [fieldError, setError])

  const submit = (values: PaymentSettingsFormValues) =>
    onSubmit({
      bankAccountPrefix: values.bankAccountPrefix === "" ? null : values.bankAccountPrefix,
      bankAccountNumber: values.bankAccountNumber,
      bankCode: values.bankCode,
      paymentReminderDays: Number(values.paymentReminderDays),
    })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Bankovní účet</legend>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr_1fr]">
            <FormField
              control={form.control}
              name="bankAccountPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Předčíslí (nepovinné)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="např. 19"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Číslo účtu</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="např. 2000145399"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kód banky</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="např. 0800"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>

        <FormField
          control={form.control}
          name="paymentReminderDays"
          render={({ field }) => (
            <FormItem className="sm:max-w-sm">
              <FormLabel>Počet dní do připomenutí platby</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="např. 14"
                  {...field}
                />
              </FormControl>
              <FormDescription>Počítá se od potvrzení účasti.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading || !canSave}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Uložit platební nastavení
          </Button>
        </div>
      </form>
    </Form>
  )
}
