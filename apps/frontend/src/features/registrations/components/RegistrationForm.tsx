import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarX, Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Form,
  FormControl,
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

// The fixed form of an adult participant (S2-07). Free beds,
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
      <div className="rounded-lg border border-dashed">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX />
            </EmptyMedia>
            <EmptyTitle>Akce nemá termíny k výběru</EmptyTitle>
            <EmptyDescription>Bez termínu nelze přihlášku odeslat.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Přihláška na akci"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-7"
      >
        <FormField
          control={form.control}
          name="termIds"
          render={({ field }) => (
            <FormItem>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-h4">Termíny</legend>
                {terms.map((term) => {
                  const id = `registration-term-${term.id}`
                  return (
                    <div
                      key={term.id}
                      className="relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 has-data-[state=checked]:border-foreground"
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
                        className="relative min-w-0 flex-1 after:absolute after:inset-0"
                      >
                        <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="min-w-0 break-words">
                            {term.label}
                            <span className="mt-0.5 block font-normal text-muted-foreground">
                              {formatCalendarRange(term.startDate, term.endDate)}
                            </span>
                          </span>
                          <span className="tabular-nums">{formatCzk(term.priceMinor)}</span>
                        </span>
                      </Label>
                    </div>
                  )
                })}
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <section
            aria-labelledby="registration-total-heading"
            aria-live="polite"
            className="flex items-center gap-3 rounded-lg bg-muted p-3"
          >
            <p
              id="registration-total-heading"
              className="min-w-0 flex-1 text-sm font-medium"
            >
              Cena vybraných termínů
            </p>
            <span className="text-base font-semibold tabular-nums">{formatCzk(totalMinor)}</span>
          </section>
          <p className="text-sm text-muted-foreground">
            Nejde o částku k úhradě. Potvrzení účasti v jednotlivých termínech a částku k úhradě
            uvidíte po odeslání.
          </p>
        </div>

        <fieldset className="space-y-4">
          <legend className="mb-4 text-h4">Kontaktní údaje</legend>
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
          existující tady nezobrazujeme. Přihlášku uvidíte po ověření odkazem z e-mailu.
        </AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-fit"
          asChild
        >
          <a href={ROUTES.myRegistrations}>Vyžádat přihlašovací odkaz</a>
        </Button>
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
