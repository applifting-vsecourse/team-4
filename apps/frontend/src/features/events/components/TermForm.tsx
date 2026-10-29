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
  onSubmit: (input: TermInput) => void | Promise<void>
}

// Adding and editing a term share this form. It has no capacity input:
// capacity comes from rooms and beds (S2-05).
export function TermForm({
  initialValues,
  isLoading,
  errorMessage,
  fieldError,
  onSubmit,
}: TermFormProps) {
  const form = useForm<TermFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  const { setError } = form

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
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

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
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Uložit termín
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
