import { useEffect, type FormEvent } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarX, Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { toE164 } from "@/lib/phone"

import {
  genderOtherSchema,
  genderSchema,
  NO_NEEDS,
  type SelectableTerm,
} from "@/features/registrations/api/registrationSchemas"
import { GenderField } from "@/features/registrations/components/GenderField"
import { PhoneField } from "@/features/registrations/components/PhoneField"
import { RegistrationNeedsFields } from "@/features/registrations/components/RegistrationNeedsFields"
import { type RegistrationSubmitError } from "@/features/registrations/lib/registrationErrors"
import { registrationNeedsFormSchema } from "@/features/registrations/lib/registrationNeeds"

const PHONE_MESSAGE = "Zadejte platné telefonní číslo pro vybranou zemi, např. 777 123 456."

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
  /** Voluntary (F64); null is "not answered". */
  gender: genderSchema.nullable(),
  /** Own words for "Jiná odpověď"; sent only beside it. */
  genderOther: genderOtherSchema,
  needs: registrationNeedsFormSchema,
})

export type RegistrationFormValues = z.infer<typeof schema>

const EMPTY: RegistrationFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  termIds: [],
  gender: null,
  genderOther: null,
  needs: NO_NEEDS,
}

type RegistrationFormProps = {
  terms: SelectableTerm[]
  /** Values to start from, e.g. a draft kept for the browser tab. */
  initialValues?: RegistrationFormValues | null
  /** Every change of the typed values, e.g. to keep them as a draft. */
  onValuesChange?: (values: RegistrationFormValues) => void
  isSubmitting: boolean
  submitError: RegistrationSubmitError | null
  onSubmit: (values: RegistrationFormValues) => void
}

// The fixed form of an adult participant (S2-07), with the optional
// transport, diet and health data for the whole registration (F63). Free beds,
// occupancy and waitlisting are deliberately absent: the server decides each
// term when saving (S2-08), and a full term can be selected like any other.
export function RegistrationForm({
  terms,
  initialValues,
  onValuesChange,
  isSubmitting,
  submitError,
  onSubmit,
}: RegistrationFormProps) {
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(schema),
    shouldFocusError: false,
    defaultValues: initialValues ?? EMPTY,
  })
  const { setError } = form
  const selectedIds = useWatch({ control: form.control, name: "termIds" })
  const selected = terms.filter((term) => selectedIds.includes(term.id))
  const totalMinor = selected.reduce((sum, term) => sum + term.priceMinor, 0)
  const needsErrors = form.formState.errors.needs

  const typed = useWatch({ control: form.control })
  useEffect(() => {
    onValuesChange?.({
      firstName: typed.firstName ?? "",
      lastName: typed.lastName ?? "",
      email: typed.email ?? "",
      phone: typed.phone ?? "",
      termIds: (typed.termIds ?? []).filter((id): id is string => typeof id === "string"),
      gender: typed.gender ?? null,
      genderOther: typed.genderOther ?? null,
      // Complete, unlike the watched copy, which types every part as optional.
      needs: form.getValues("needs"),
    })
  }, [typed, onValuesChange])

  useEffect(() => {
    if (submitError?.kind === "terms") {
      setError("termIds", { type: "server", message: submitError.message })
    }
  }, [submitError, setError])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    const formElement = event.currentTarget
    return form.handleSubmit(onSubmit, () => {
      // The first invalid field in page order, whatever kind of control it is.
      // Wait for the errors to be rendered into the fields.
      requestAnimationFrame(() => {
        const field = formElement.querySelector<HTMLElement>('[aria-invalid="true"]')
        field?.focus({ preventScroll: true })
        field?.scrollIntoView({ block: "center", behavior: "smooth" })
      })
    })(event)
  }

  if (terms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX />
            </EmptyMedia>
            <EmptyTitle>Akce nemá termíny k výběru</EmptyTitle>
            <EmptyDescription>
              Pořadatel zatím nevypsal žádný termín, a proto se na akci nelze přihlásit. Zkuste to
              později.
            </EmptyDescription>
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
        onSubmit={submit}
        className="space-y-10"
      >
        <section
          aria-label="Výběr termínů"
          className="space-y-5"
        >
          <FormField
            control={form.control}
            name="termIds"
            render={({ field, fieldState }) => (
              <FormItem>
                <fieldset className="space-y-3">
                  <legend className="mb-3 flex w-full flex-wrap items-center gap-3 text-h4">
                    <span>Termíny</span>
                    <Badge variant="outline">Povinné</Badge>
                  </legend>
                  {terms.map((term) => {
                    const id = `registration-term-${term.id}`
                    return (
                      <div
                        key={term.id}
                        className="relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 has-data-[state=checked]:border-foreground"
                      >
                        <Checkbox
                          id={id}
                          aria-invalid={fieldState.error ? true : undefined}
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
                              <span className="mt-2 block font-normal text-muted-foreground">
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
                <FormMessage className="min-h-0" />
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
        </section>

        <fieldset className="space-y-5">
          <legend className="mb-5 flex w-full flex-wrap items-center gap-3 text-h4">
            <span>Kontaktní údaje</span>
            <Badge variant="outline">Povinné</Badge>
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Jméno <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="given-name"
                      aria-required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="min-h-0" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Příjmení <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="family-name"
                      aria-required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="min-h-0" />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  E-mail <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    aria-required
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="min-h-0" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Telefon <RequiredMark />
                </FormLabel>
                <FormControl>
                  <PhoneField {...field} />
                </FormControl>
                <FormMessage className="min-h-0" />
              </FormItem>
            )}
          />
        </fieldset>

        <section
          aria-label="Doplňující údaje"
          className="space-y-6 rounded-lg border border-border bg-card p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h4">Doplňující údaje</h2>
            <Badge variant="secondary">Nepovinné</Badge>
          </div>

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <GenderField
                id="registration-gender"
                value={{ gender: field.value, genderOther: typed.genderOther ?? null }}
                onChange={(answer) => {
                  field.onChange(answer.gender)
                  form.setValue("genderOther", answer.genderOther)
                }}
              />
            )}
          />

          <fieldset className="space-y-4">
            <legend className="sr-only">Doprava, strava a zdraví</legend>
            <FormField
              control={form.control}
              name="needs"
              render={({ field }) => (
                <RegistrationNeedsFields
                  defaultValue={field.value}
                  onChange={field.onChange}
                  errors={{
                    transportNote: needsErrors?.transportNote?.message,
                    diet: needsErrors?.diet?.message,
                    dietNote: needsErrors?.dietNote?.message,
                    health: needsErrors?.health?.message,
                  }}
                />
              )}
            />
          </fieldset>
        </section>

        {submitError ? <SubmitErrorAlert error={submitError} /> : null}

        <Button
          type="submit"
          size="lg"
          className="w-full max-w-sm sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? "Odesílám přihlášku…" : "Odeslat přihlášku"}
        </Button>
      </form>
    </Form>
  )
}

// Visual marker of a required field; the form explains it at the top.
function RequiredMark() {
  return (
    <span
      aria-hidden="true"
      className="text-destructive"
    >
      *
    </span>
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
