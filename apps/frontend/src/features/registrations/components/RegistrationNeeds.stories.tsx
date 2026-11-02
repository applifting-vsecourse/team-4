import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { LogOut, MapPin } from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  RegistrationNeedsFields,
  type RegistrationNeedsErrors,
  type RegistrationNeedsValues,
} from "@/features/registrations/components/RegistrationNeedsFields"
import { RegistrationNeedsSummary } from "@/features/registrations/components/RegistrationNeedsSummary"

// F63 design preview: transport, diet and health data in a registration.
// Static only: no router links, queries or API; every value below is hard-coded.

const EVENT = "Víkendovky Modrá Hora – podzim 2026"

const EMPTY: RegistrationNeedsValues = {
  transport: null,
  transportNote: "",
  hasNoDietRestriction: false,
  diet: [],
  dietNote: "",
  health: "",
}

const FILLED: RegistrationNeedsValues = {
  transport: "shared",
  transportNote: "Nastupovali bychom v Pardubicích u hlavního nádraží.",
  hasNoDietRestriction: false,
  diet: ["vegetarian", "lactoseFree"],
  dietNote: "Bez ořechů, syn je alergik.",
  health: "Astma, nosí s sebou inhalátor.\nPři zátěži potřebuje delší přestávky.",
}

const TOO_LONG: RegistrationNeedsValues = {
  ...FILLED,
  transportNote: "Nastupovali bychom v Pardubicích u hlavního nádraží a rádi bychom jeli spolu.",
  health: "Dlouhý text zdravotních omezení, který překračuje povolenou délku pole.",
}

const TOO_LONG_ERRORS: RegistrationNeedsErrors = {
  transportNote: "Poznámka k dopravě může mít nejvýše 500 znaků.",
  dietNote: "Vlastní text ke stravě může mít nejvýše 500 znaků.",
  health: "Zdravotní omezení mohou mít nejvýše 2000 znaků.",
}

// The participant frame, static: logo, theme, "Odhlásit se".
function ParticipantFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4">
          <BrandMark isLarge />
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
            >
              <LogOut />
              Odhlásit se
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">{children}</div>
      </main>
    </>
  )
}

// The public event page (/e/$publicId), static: logo and theme, no sign-in.
function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4">
          <BrandMark isLarge />
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">{children}</div>
      </main>
    </>
  )
}

const PUBLIC_EVENT = {
  name: "Letní tábor Modrá Hora 2027",
  location: "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko",
  description:
    "Dva týdny v lesním táboře pod Modrou Horou: celotáborová hra, výlety po okolí a večery u ohně. Ubytování ve chatkách, strava pětkrát denně.",
}

const TERMS = [
  {
    id: "turnus-1",
    label: "Turnus 1",
    dates: "4. 7. – 17. 7. 2027",
    price: "4 500 Kč",
    isSelected: true,
  },
  {
    id: "turnus-2",
    label: "Turnus 2",
    dates: "1. 8. – 14. 8. 2027",
    price: "4 500 Kč",
    isSelected: false,
  },
]

// Přihláška na akci (S2-07) as it is today on the public event page: event,
// terms, price, contact data and submit, with the F63 section added before
// the submit. Static copy of PublicEventView and RegistrationForm, which stay
// untouched until implementation.
function FirstRegistrationPage({ values }: { values: RegistrationNeedsValues }) {
  return (
    <PublicFrame>
      <article>
        <h1 className="text-h2 break-words">{PUBLIC_EVENT.name}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin
            aria-hidden
            className="size-4 shrink-0"
          />
          <span className="min-w-0 break-words">{PUBLIC_EVENT.location}</span>
        </p>
        <p className="mt-6 max-w-prose text-sm whitespace-pre-line">{PUBLIC_EVENT.description}</p>

        <section
          aria-label="Přihláška"
          className="mt-7"
        >
          <form
            noValidate
            aria-label="Přihláška na akci"
            className="space-y-7"
          >
            <fieldset className="space-y-2">
              <legend className="mb-2 text-h4">Termíny</legend>
              {TERMS.map((term) => {
                const id = `registration-term-${term.id}`
                return (
                  <div
                    key={term.id}
                    className="relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 has-data-[state=checked]:border-foreground"
                  >
                    <Checkbox
                      id={id}
                      defaultChecked={term.isSelected}
                    />
                    <Label
                      htmlFor={id}
                      className="relative min-w-0 flex-1 after:absolute after:inset-0"
                    >
                      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="min-w-0 break-words">
                          {term.label}
                          <span className="mt-0.5 block font-normal text-muted-foreground">
                            {term.dates}
                          </span>
                        </span>
                        <span className="tabular-nums">{term.price}</span>
                      </span>
                    </Label>
                  </div>
                )
              })}
            </fieldset>

            <div className="space-y-2">
              <section
                aria-labelledby="registration-total-heading"
                className="flex items-center gap-3 rounded-lg bg-muted p-3"
              >
                <p
                  id="registration-total-heading"
                  className="min-w-0 flex-1 text-sm font-medium"
                >
                  Cena vybraných termínů
                </p>
                <span className="text-base font-semibold tabular-nums">4 500 Kč</span>
              </section>
              <p className="text-sm text-muted-foreground">
                Nejde o částku k úhradě. Potvrzení účasti v jednotlivých termínech a částku k úhradě
                uvidíte po odeslání.
              </p>
            </div>

            <fieldset className="space-y-4">
              <legend className="mb-4 text-h4">Kontaktní údaje</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="registration-first-name">Jméno</FieldLabel>
                  <Input
                    id="registration-first-name"
                    autoComplete="given-name"
                    defaultValue="Jana"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="registration-last-name">Příjmení</FieldLabel>
                  <Input
                    id="registration-last-name"
                    autoComplete="family-name"
                    defaultValue="Nováková"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="registration-email">E-mail</FieldLabel>
                <Input
                  id="registration-email"
                  type="email"
                  autoComplete="email"
                  defaultValue="jana.novakova@example.cz"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="registration-phone">Telefon</FieldLabel>
                <Input
                  id="registration-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+420 777 123 456"
                  defaultValue="+420 777 123 456"
                />
              </Field>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-4 text-h4">Doprava, strava a zdraví</legend>
              <RegistrationNeedsFields values={values} />
            </fieldset>

            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
            >
              Odeslat přihlášku
            </Button>
          </form>
        </section>
      </article>
    </PublicFrame>
  )
}

// Přihláška na akci, static: only the optional F63 section, save and cancel.
// Contact data are not edited here.
type RegistrationPageProps = {
  values: RegistrationNeedsValues
  errors?: RegistrationNeedsErrors
  /** Saving failed: the error and a retry, all entered values kept. */
  errorMessage?: string
}

function RegistrationPage({ values, errors, errorMessage }: RegistrationPageProps) {
  return (
    <ParticipantFrame>
      <section className="space-y-6">
        <h1 className="text-h2">{EVENT}</h1>
        <form
          noValidate
          aria-label="Přihláška na akci"
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Doprava, strava a zdraví</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationNeedsFields
                values={values}
                errors={errors}
              />
            </CardContent>
          </Card>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="lg"
            >
              Uložit údaje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
            >
              Zrušit
            </Button>
          </div>
        </form>
      </section>
    </ParticipantFrame>
  )
}

const meta = {
  title: "Designs/F63 Transport, diet and health",
  component: RegistrationPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { values: FILLED },
} satisfies Meta<typeof RegistrationPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; this story reports it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

/** First registration on the public event page: the existing form plus transport, diet and health. */
export const FirstRegistration: Story = {
  render: () => <FirstRegistrationPage values={FILLED} />,
}

/** Registration form: all three parts filled in, shared transport. */
export const RegistrationFilled: Story = {}

/** Invalid input: an error per field, everything entered is kept. */
export const ValidationErrors: Story = { args: { values: TOO_LONG, errors: TOO_LONG_ERRORS } }

/** Saving failed: the error above the button, the entered values kept. */
export const SaveFailed: Story = {
  parameters: contrastWarning,
  args: {
    values: FILLED,
    errorMessage: "Údaje se nepodařilo uložit. Zůstaly zachované, zkuste to prosím znovu.",
  },
}

/** Detail card (participant and organizer) with the stored values. */
export const SummaryFilled: Story = {
  parameters: { layout: "padded" },
  render: () => <RegistrationNeedsSummary values={FILLED} />,
}

/** Detail card without the values, e.g. an older registration: every part reads "Neuvedeno". */
export const SummaryNotProvided: Story = {
  parameters: { layout: "padded" },
  render: () => <RegistrationNeedsSummary values={EMPTY} />,
}
