// Brand → Směr A → Přihláška (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: form on the left, a sticky summary of the event, picked terms and price on the right;
// on a phone the summary comes first and the form ends with the submit button. Every section puts
// its title above its fields, on a phone and a desktop alike.
import type { ReactNode } from "react"
import { ArrowLeftIcon, CalendarBlankIcon, MapPinIcon, UsersThreeIcon } from "@phosphor-icons/react"

import { BrandMark } from "@/components/BrandMark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

import { EVENT, FORM, TERMS } from "@/features/brand/data"
import { BrandGenderField, BrandPhoneField } from "@/features/brand/fields"

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-4 px-5 py-6 sm:px-6"
    >
      <div className="space-y-1">
        <h2
          id={id}
          className="text-base"
        >
          {title}
        </h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function TextField({ id, label, value }: { id: string; label: string; value?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        defaultValue={value}
      />
    </Field>
  )
}

function SelectField({
  id,
  label,
  options,
  placeholder = "Vyberte",
}: {
  id: string
  label: string
  options: string[]
  placeholder?: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select>
        <SelectTrigger
          id={id}
          className="w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option}
              value={option}
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function Summary({ hasSubmit }: { hasSubmit: boolean }) {
  const picked = TERMS.filter((term) => FORM.selectedTermIds.includes(term.id))
  return (
    <Card>
      <CardContent>
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-base font-semibold">{EVENT.name}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CalendarBlankIcon
                  aria-hidden
                  className="size-4 shrink-0"
                />
                {EVENT.dates}
              </li>
              <li className="flex items-center gap-2">
                <MapPinIcon
                  aria-hidden
                  className="size-4 shrink-0"
                />
                {EVENT.location}
              </li>
              <li className="flex items-center gap-2">
                <UsersThreeIcon
                  aria-hidden
                  className="size-4 shrink-0"
                />
                {EVENT.age}
              </li>
            </ul>
          </div>
          <Separator />
          <dl className="space-y-2 text-sm">
            {picked.map((term) => (
              <div
                key={term.id}
                className="flex items-baseline justify-between gap-3"
              >
                <dt>{term.label}</dt>
                <dd className="font-mono tabular-nums">{term.price}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 border-t pt-3">
              <dt className="font-medium">Cena vybraných termínů</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">{FORM.total}</dd>
            </div>
          </dl>
          {hasSubmit ? (
            <div className="space-y-2">
              <Button className="w-full">Odeslat přihlášku</Button>
              <p className="text-xs text-muted-foreground">
                Částku k úhradě potvrdí organizátor e-mailem.
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function RegistrationA() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <Button
            variant="ghost"
            size="sm"
          >
            Přihlásit se
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-10">
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
          >
            <ArrowLeftIcon aria-hidden />
            Zpět na detail akce
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl">Přihláška na akci</h1>
            <p className="text-sm text-muted-foreground">
              {EVENT.organization} · {EVENT.deadline}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          <div className="lg:hidden">
            <Summary hasSubmit={false} />
          </div>

          <form
            aria-label="Přihláška na akci"
            className="lg:col-span-2"
          >
            <Card padding="none">
              <Section
                id="a-terms"
                title="Termíny"
                hint="Vyberte jeden nebo více."
              >
                <FieldSet>
                  <FieldLegend className="sr-only">Termíny</FieldLegend>
                  <ul className="divide-y rounded-lg border">
                    {TERMS.map((term) => (
                      <li
                        key={term.id}
                        className="p-3 has-data-[state=checked]:bg-accent"
                      >
                        <Field orientation="horizontal">
                          <Checkbox
                            id={`a-term-${term.id}`}
                            defaultChecked={FORM.selectedTermIds.includes(term.id)}
                          />
                          <FieldLabel
                            htmlFor={`a-term-${term.id}`}
                            className="min-w-0 flex-1"
                          >
                            <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                              <span className="min-w-0 space-y-1">
                                <span className="block break-words">{term.label}</span>
                                <span className="flex flex-wrap items-center gap-2 text-sm font-normal text-muted-foreground">
                                  {term.dates}
                                  {term.isFull ? (
                                    <Badge variant="warning">Obsazeno, jen náhradníci</Badge>
                                  ) : (
                                    <span>· {term.availability}</span>
                                  )}
                                </span>
                              </span>
                              <span className="font-mono tabular-nums">{term.price}</span>
                            </span>
                          </FieldLabel>
                        </Field>
                      </li>
                    ))}
                  </ul>
                </FieldSet>
              </Section>
              <Separator />
              <Section
                id="a-participant"
                title="Účastník"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="a-first-name"
                    label="Jméno"
                    value={FORM.firstName}
                  />
                  <TextField
                    id="a-last-name"
                    label="Příjmení"
                    value={FORM.lastName}
                  />
                  <TextField
                    id="a-birth"
                    label="Datum narození"
                    value={FORM.birthDate}
                  />
                </div>
                <BrandGenderField id="a-gender" />
              </Section>
              <Separator />
              <Section
                id="a-contact"
                title="Kontakt"
                hint="Na e-mail pošleme potvrzení."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="a-email"
                    label="E-mail"
                    value={FORM.email}
                  />
                  <BrandPhoneField id="a-phone" />
                </div>
              </Section>
              <Separator />
              <Section
                id="a-questions"
                title="Otázky organizátora"
              >
                <SelectField
                  id="a-school"
                  label="Škola"
                  options={FORM.schools}
                />
                <FieldSet>
                  <FieldLegend variant="label">Oddíl</FieldLegend>
                  <RadioGroup className="flex flex-wrap">
                    {FORM.troops.map((troop) => (
                      <Field
                        key={troop}
                        orientation="horizontal"
                      >
                        <RadioGroupItem
                          id={`a-troop-${troop}`}
                          value={troop}
                        />
                        <FieldLabel htmlFor={`a-troop-${troop}`}>{troop}</FieldLabel>
                      </Field>
                    ))}
                  </RadioGroup>
                </FieldSet>
              </Section>
              <Separator />
              <Section
                id="a-needs"
                title="Doprava, strava a zdraví"
                hint="Nepovinné."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    id="a-transport"
                    label="Doprava"
                    options={FORM.transport}
                  />
                  <SelectField
                    id="a-diet"
                    label="Strava"
                    options={FORM.diets}
                  />
                </div>
                <Field>
                  <FieldLabel htmlFor="a-health">Zdravotní omezení</FieldLabel>
                  <Textarea id="a-health" />
                </Field>
              </Section>
              <Separator />
              <Section
                id="a-conditions"
                title="Podmínky účasti"
              >
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {EVENT.conditions.map((condition) => (
                    <li key={condition}>{condition}</li>
                  ))}
                </ul>
                <Field orientation="horizontal">
                  <Checkbox id="a-conditions-check" />
                  <FieldLabel htmlFor="a-conditions-check">
                    Potvrzuji, že jsem si přečetl/a podmínky účasti
                  </FieldLabel>
                </Field>
              </Section>
              <div className="border-t px-5 py-4 sm:px-6 lg:hidden">
                <Button className="w-full max-w-sm">Odeslat přihlášku</Button>
              </div>
            </Card>
          </form>

          <aside
            aria-label="Shrnutí přihlášky"
            className="hidden lg:sticky lg:top-6 lg:block"
          >
            <Summary hasSubmit />
          </aside>
        </div>
      </main>
    </div>
  )
}
