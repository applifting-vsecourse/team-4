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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { type PaymentSettings } from "@/features/events/api/paymentSettingsSchemas"

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
  paymentDueDays: z
    .string()
    .trim()
    .min(1, "Vyplňte splatnost ve dnech.")
    .regex(/^[0-9]+$/, "Splatnost zadejte jako celý počet dní.")
    .refine((value) => Number(value) >= 1, "Splatnost musí být alespoň 1 den."),
})

export type PaymentSettingsFormValues = z.infer<typeof schema>

export type PaymentFieldError = { field: keyof PaymentSettingsFormValues; message: string }

export const EMPTY_PAYMENT_SETTINGS: PaymentSettingsFormValues = {
  bankAccountPrefix: "",
  bankAccountNumber: "",
  bankCode: "",
  paymentDueDays: "",
}

export const toFormValues = (settings: PaymentSettings | null): PaymentSettingsFormValues =>
  settings
    ? {
        bankAccountPrefix: settings.bankAccountPrefix ?? "",
        bankAccountNumber: settings.bankAccountNumber,
        bankCode: settings.bankCode,
        paymentDueDays: String(settings.paymentDueDays),
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
  const { setError } = form

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
      paymentDueDays: Number(values.paymentDueDays),
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
          name="paymentDueDays"
          render={({ field }) => (
            <FormItem className="sm:max-w-sm">
              <FormLabel>Splatnost (dní od potvrzení přihlášky)</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="např. 14"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Uložit platební nastavení
          </Button>
        </div>
      </form>
    </Form>
  )
}
