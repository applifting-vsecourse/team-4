import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { DialogActions } from "@/components/DialogActions"
import { FormError } from "@/components/FormError"
import { Combobox } from "@/components/ui/combobox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

import type { ManualPairing, RegistrationOption } from "@/features/payments/api/paymentSchemas"

const MAX_REASON = 500

const schema = z.object({
  registrationId: z.string().min(1, "Vyberte přihlášku."),
  reason: z
    .string()
    .trim()
    .min(1, "Uveďte důvod přiřazení.")
    .max(MAX_REASON, `Důvod může mít nejvýše ${MAX_REASON} znaků.`),
})

type PairTransactionFormProps = {
  options: RegistrationOption[]
  isLoading: boolean
  errorMessage?: string
  /** A registration the server refused, shown at the selection. */
  registrationError?: string
  onSubmit: (pairing: ManualPairing) => void
}

// The registration of the same event and the reason (F24). Nothing is sent
// without both, and the values stay after a failed save.
export function PairTransactionForm({
  options,
  isLoading,
  errorMessage,
  registrationError,
  onSubmit,
}: PairTransactionFormProps) {
  const form = useForm<z.input<typeof schema>, unknown, ManualPairing>({
    resolver: zodResolver(schema),
    defaultValues: { registrationId: "", reason: "" },
  })
  const { setError } = form

  useEffect(() => {
    if (registrationError) {
      setError("registrationId", { type: "server", message: registrationError })
    }
  }, [registrationError, setError])

  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Přiřadit transakci"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {errorMessage ? <FormError message={errorMessage} /> : null}

        <FormField
          control={form.control}
          name="registrationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Přihláška</FormLabel>
              <FormControl>
                <Combobox
                  options={options.map((option) => ({
                    value: option.id,
                    label: `${option.firstName} ${option.lastName}`,
                    description: option.email,
                    keywords: [option.email],
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={field.disabled}
                  ref={field.ref}
                  placeholder="Vyberte přihlášku"
                  searchPlaceholder="Hledat jméno nebo e-mail…"
                  emptyText="Žádná přihláška neodpovídá hledání."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Důvod přiřazení</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Např. platba za přihlášku"
                  rows={3}
                  maxLength={MAX_REASON}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogActions
          submitLabel="Přiřadit"
          isPending={isLoading}
        />
      </form>
    </Form>
  )
}
