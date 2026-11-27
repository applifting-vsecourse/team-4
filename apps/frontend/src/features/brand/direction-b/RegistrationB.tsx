// Brand → Směr B → Přihláška (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: a warm event header with the key facts as pills, then numbered sections in one
// column, terms as selectable cards, and a sticky bottom bar with the price and the submit button.
import type { ReactNode } from "react"
import { IconArrowLeft, IconCalendar, IconMapPin, IconTent, IconUsers } from "@tabler/icons-react"

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
import { Textarea } from "@/components/ui/textarea"

import { EVENT, FORM, TERMS } from "@/features/brand/data"

function NumberedSection({
  number,
  id,
  title,
  isOptional = false,
  children,
}: {
  number: number
  id: string
  title: string
  isOptional?: boolean
  children: ReactNode
}) {
  return (
    <Card>
      <CardContent>
        <section
          aria-labelledby={id}
          className="space-y-5"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
            >
              {number}
            </span>
            <h2
              id={id}
              className="text-xl"
            >
              {title}
            </h2>
            {isOptional ? (
              <span className="ml-auto text-sm text-muted-foreground">Nepovinné</span>
            ) : null}
          </div>
          {children}
        </section>
      </CardContent>
    </Card>
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

function SelectField({ id, label, options }: { id: string; label: string; options: string[] }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select>
        <SelectTrigger
          id={id}
          className="w-full"
        >
          <SelectValue placeholder="Vyberte" />
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

function ChoicePills({
  name,
  legend,
  options,
}: {
  name: string
  legend: string
  options: string[]
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <RadioGroup className="flex flex-wrap">
        {options.map((option) => (
          <div
            key={option}
            className="rounded-full border px-3 py-2 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
          >
            <Field orientation="horizontal">
              <RadioGroupItem
                id={`${name}-${option}`}
                value={option}
              />
              <FieldLabel htmlFor={`${name}-${option}`}>{option}</FieldLabel>
            </Field>
          </div>
        ))}
      </RadioGroup>
    </FieldSet>
  )
}

export function RegistrationB() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <BrandMark />
        <Button
          variant="ghost"
          size="sm"
        >
          Přihlásit se
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-4">
        <Button
          variant="ghost"
          size="sm"
        >
          <IconArrowLeft aria-hidden />
          Zpět na detail akce
        </Button>

        <div className="mt-3 space-y-4 rounded-3xl bg-secondary p-5 text-secondary-foreground sm:p-8">
          <p className="flex items-center gap-2 text-sm font-medium">
            <IconTent
              aria-hidden
              className="size-5 shrink-0"
            />
            {EVENT.organization}
          </p>
          <h1 className="text-3xl text-foreground sm:text-4xl">{EVENT.name}</h1>
          <ul className="flex flex-wrap gap-2 text-sm text-foreground">
            <li className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1">
              <IconCalendar
                aria-hidden
                className="size-4 shrink-0"
              />
              {EVENT.dates}
            </li>
            <li className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1">
              <IconMapPin
                aria-hidden
                className="size-4 shrink-0"
              />
              Hlinsko
            </li>
            <li className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1">
              <IconUsers
                aria-hidden
                className="size-4 shrink-0"
              />
              {EVENT.age}
            </li>
          </ul>
        </div>

        <form
          aria-label="Přihláška na akci"
          className="mt-6 space-y-4"
        >
          <NumberedSection
            number={1}
            id="b-terms"
            title="Vyberte termín"
          >
            <FieldSet>
              <FieldLegend className="sr-only">Termíny</FieldLegend>
              <div className="grid gap-3 sm:grid-cols-2">
                {TERMS.map((term, index) => (
                  <div
                    key={term.id}
                    className={
                      index === TERMS.length - 1
                        ? "rounded-2xl border-2 border-border p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent sm:col-span-2"
                        : "rounded-2xl border-2 border-border p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
                    }
                  >
                    <Field orientation="horizontal">
                      <FieldLabel
                        htmlFor={`b-term-${term.id}`}
                        className="min-w-0 flex-1"
                      >
                        <span className="block min-w-0 space-y-1">
                          <span className="block text-base font-semibold break-words">
                            {term.label}
                          </span>
                          <span className="block font-normal text-muted-foreground">
                            {term.dates}
                          </span>
                        </span>
                      </FieldLabel>
                      <Checkbox
                        id={`b-term-${term.id}`}
                        defaultChecked={FORM.selectedTermIds.includes(term.id)}
                      />
                    </Field>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-lg font-semibold tabular-nums">{term.price}</span>
                      <Badge variant={term.isFull ? "warning" : "secondary"}>
                        {term.isFull ? "Jen náhradníci" : term.availability}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </FieldSet>
          </NumberedSection>

          <NumberedSection
            number={2}
            id="b-participant"
            title="Kdo pojede"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="b-first-name"
                label="Jméno"
                value={FORM.firstName}
              />
              <TextField
                id="b-last-name"
                label="Příjmení"
                value={FORM.lastName}
              />
              <TextField
                id="b-birth"
                label="Datum narození"
                value={FORM.birthDate}
              />
            </div>
            <ChoicePills
              name="b-gender"
              legend="Pohlaví"
              options={FORM.genders}
            />
          </NumberedSection>

          <NumberedSection
            number={3}
            id="b-contact"
            title="Kontakt na rodiče"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="b-email"
                label="E-mail"
                value={FORM.email}
              />
              <TextField
                id="b-phone"
                label="Telefon"
                value={FORM.phone}
              />
            </div>
          </NumberedSection>

          <NumberedSection
            number={4}
            id="b-more"
            title="Oddíl, doprava a zdraví"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="b-school"
                label="Škola"
                options={FORM.schools}
              />
              <SelectField
                id="b-transport"
                label="Doprava (nepovinné)"
                options={FORM.transport}
              />
            </div>
            <ChoicePills
              name="b-troop"
              legend="Oddíl"
              options={FORM.troops}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="b-diet"
                label="Strava (nepovinné)"
                options={FORM.diets}
              />
              <Field>
                <FieldLabel htmlFor="b-health">Zdravotní omezení (nepovinné)</FieldLabel>
                <Textarea id="b-health" />
              </Field>
            </div>
          </NumberedSection>

          <NumberedSection
            number={5}
            id="b-conditions"
            title="Podmínky účasti"
          >
            <ul className="space-y-2 text-sm">
              {EVENT.conditions.map((condition) => (
                <li
                  key={condition}
                  className="rounded-xl bg-muted px-3 py-2"
                >
                  {condition}
                </li>
              ))}
            </ul>
            <Field orientation="horizontal">
              <Checkbox id="b-conditions-check" />
              <FieldLabel htmlFor="b-conditions-check">
                Potvrzuji, že jsem si přečetl/a podmínky účasti
              </FieldLabel>
            </Field>
          </NumberedSection>

          <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-full bg-foreground py-2 pr-2 pl-5 text-background shadow-lg dark:bg-card dark:text-card-foreground">
            <p className="min-w-0 text-sm">
              <span className="block text-xs">Turnus 1 · cena vybraných termínů</span>
              <span className="block text-base font-semibold tabular-nums">{FORM.total}</span>
            </p>
            <Button size="lg">Odeslat přihlášku</Button>
          </div>
        </form>
      </main>
    </div>
  )
}
