import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarX, Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
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
import { Label } from "@/components/ui/label"
import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type SelectableTerm } from "@/features/registrations/api/registrationSchemas"
import { toE164 } from "@/features/registrations/lib/phone"
import { type RegistrationSubmitError } from "@/features/registrations/lib/registrationErrors"

const PHONE_MESSAGE = "Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456."

const schema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Vyplňte jméno.")
    .max(100, "Jméno může mít nejvýše 100 znaků."),
  lastName: z
    .string()
    .trim()
    .min(1, "Vyplňte příjmení.")
    .max(100, "Příjmení může mít nejvýše 100 znaků."),
  email: z
    .string()
    .trim()
    .min(1, "Vyplňte e-mail.")
    .max(320, "E-mail může mít nejvýše 320 znaků.")
    .email("Zadejte platný e-mail."),
  phone: z
    .string()
    .trim()
    .min(1, "Vyplňte telefon.")
    .refine((value) => toE164(value) !== null, PHONE_MESSAGE),
  termIds: z.array(z.string()).min(1, "Vyberte alespoň jeden termín."),
})

export type RegistrationFormValues = z.infer<typeof schema>

const EMPTY: RegistrationFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  termIds: [],
}

type RegistrationFormProps = {
  terms: SelectableTerm[]
  isSubmitting: boolean
  submitError: RegistrationSubmitError | null
  onSubmit: (values: RegistrationFormValues) => void
}

// The fixed form of an adult participant (S2-07, Wireframy F1). Free beds,
// occupancy and waitlisting are deliberately absent: the server decides each
// term when saving (S2-08), and a full term can be selected like any other.
export function RegistrationForm({
  terms,
  isSubmitting,
  submitError,
  onSubmit,
}: RegistrationFormProps) {
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  })
  const { setError } = form
  const selectedIds = useWatch({ control: form.control, name: "termIds" })
  const selected = terms.filter((term) => selectedIds.includes(term.id))
  const totalMinor = selected.reduce((sum, term) => sum + term.priceMinor, 0)

  useEffect(() => {
    if (submitError?.kind === "terms") {
      setError("termIds", { type: "server", message: submitError.message })
    }
  }, [submitError, setError])

  if (terms.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX />
          </EmptyMedia>
          <EmptyTitle>Akce nemá termíny k výběru</EmptyTitle>
          <EmptyDescription>Bez termínu nelze přihlášku odeslat.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Přihláška na akci"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="termIds"
          render={({ field }) => (
            <FormItem>
              <fieldset className="space-y-2">
                <legend className="mb-3 text-h4">Termíny</legend>
                {terms.map((term) => {
                  const id = `registration-term-${term.id}`
                  return (
                    <div
                      key={term.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <Checkbox
                        id={id}
                        checked={field.value.includes(term.id)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked === true
                              ? [...field.value, term.id]
                              : field.value.filter((termId) => termId !== term.id),
                          )
                        }
                      />
                      <Label
                        htmlFor={id}
                        className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
                      >
                        <span className="min-w-0 break-words">
                          {term.label}
                          <span className="block font-normal text-muted-foreground">
                            {formatCalendarRange(term.startDate, term.endDate)}
                          </span>
                        </span>
                        <span className="font-mono">{formatCzk(term.priceMinor)}</span>
                      </Label>
                    </div>
                  )
                })}
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />

        <section
          aria-labelledby="registration-total-heading"
          aria-live="polite"
          className="rounded-lg bg-muted p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3
              id="registration-total-heading"
              className="text-sm font-medium"
            >
              Cena vybraných termínů
            </h3>
            <span className="font-mono text-base font-medium">{formatCzk(totalMinor)}</span>
          </div>
          {selected.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {selected.map((term) => (
                <li
                  key={term.id}
                  className="flex justify-between gap-3"
                >
                  <span className="min-w-0 break-words">{term.label}</span>
                  <span className="font-mono">{formatCzk(term.priceMinor)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-sm">
            Nejde o částku k úhradě. Potvrzení účasti v jednotlivých termínech a částku k úhradě
            uvidíte po odeslání.
          </p>
        </section>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-h4">Kontaktní údaje</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jméno</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="given-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Příjmení</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="family-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+420 777 123 456"
                    {...field}
                  />
                </FormControl>
                <FormDescription>S mezinárodní předvolbou, např. +420 777 123 456.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        {submitError ? <SubmitErrorAlert error={submitError} /> : null}

        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? "Odesílám přihlášku…" : "Odeslat přihlášku"}
        </Button>
      </form>
    </Form>
  )
}

function SubmitErrorAlert({ error }: { error: RegistrationSubmitError }) {
  if (error.kind === "terms") return null
  if (error.kind === "already_registered") {
    return (
      <Alert>
        <AlertTitle>Přihláška s tímto e-mailem již existuje</AlertTitle>
        <AlertDescription>
          Na tuto akci je s tímto e-mailem už přihláška uložená. Novou jsme nevytvořili a údaje té
          existující tady nezobrazujeme.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      {error.kind === "unavailable" ? (
        <>
          <AlertTitle>Přihlašování není dostupné</AlertTitle>
          <AlertDescription>
            Na tuto akci se teď nelze přihlásit. Přihláška nebyla uložena.
          </AlertDescription>
        </>
      ) : (
        <AlertDescription>{error.message}</AlertDescription>
      )}
    </Alert>
  )
}
