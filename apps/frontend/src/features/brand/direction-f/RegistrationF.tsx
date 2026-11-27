// Brand → Směr F → Přihláška (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: a navy sign band with the event and its facts as pictograms in yellow squares,
// section headings led by a pictogram square, terms as a timetable, and the price on a navy plate
// next to the submit button.
import type { ReactNode } from "react"
import {
  ArrowLeft,
  Calendar,
  Checkmark,
  Email,
  Events,
  Information,
  Location,
  Time,
  User,
} from "@carbon/icons-react"

import { BrandMark } from "@/components/BrandMark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

type Pictogram = typeof Calendar

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string
  icon: Pictogram
  title: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-5 rounded-md bg-card p-5 sm:p-6"
    >
      <h2
        id={id}
        className="flex items-center gap-3 text-xl"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-secondary text-secondary-foreground">
          <Icon
            aria-hidden
            size={20}
          />
        </span>
        {title}
      </h2>
      {children}
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

function Fact({ icon: Icon, label, value }: { icon: Pictogram; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground">
        <Icon
          aria-hidden
          size={24}
        />
      </span>
      <p className="min-w-0">
        <span className="block font-mono text-xs uppercase">{label}</span>
        <span className="block font-semibold">{value}</span>
      </p>
    </li>
  )
}

export function RegistrationF() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-3xl space-y-8 px-4 pt-4 pb-8">
          <header className="flex items-center justify-between">
            <BrandMark />
            <a
              href="/e/letni-tabor-2027"
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <ArrowLeft
                aria-hidden
                size={16}
              />
              Zpět na detail akce
            </a>
          </header>
          <div className="space-y-2">
            <p className="font-mono text-sm uppercase">{EVENT.organization}</p>
            <h1 className="text-4xl leading-none sm:text-5xl">{EVENT.name}</h1>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            <Fact
              icon={Calendar}
              label="Kdy"
              value={EVENT.dates}
            />
            <Fact
              icon={Location}
              label="Kde"
              value="Hlinsko"
            />
            <Fact
              icon={Events}
              label="Pro koho"
              value={EVENT.age}
            />
            <Fact
              icon={Time}
              label="Uzávěrka"
              value="31. 5. 2027"
            />
          </ul>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form
          aria-label="Přihláška na akci"
          className="space-y-4"
        >
          <Section
            id="f-terms"
            icon={Calendar}
            title="Termíny"
          >
            <FieldSet>
              <FieldLegend className="sr-only">Termíny</FieldLegend>
              <div
                aria-hidden
                className="hidden grid-cols-6 gap-x-3 pr-3 pl-11 font-mono text-xs uppercase sm:grid"
              >
                <span className="col-span-2">Termín</span>
                <span className="col-span-2">Kdy</span>
                <span className="text-right">Cena</span>
                <span className="text-right">Místa</span>
              </div>
              <ul className="space-y-2">
                {TERMS.map((term) => (
                  <li
                    key={term.id}
                    className="rounded-sm border-l-4 border-border bg-muted p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
                  >
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`f-term-${term.id}`}
                        defaultChecked={FORM.selectedTermIds.includes(term.id)}
                      />
                      <FieldLabel
                        htmlFor={`f-term-${term.id}`}
                        className="min-w-0 flex-1"
                      >
                        <span className="grid min-w-0 flex-1 gap-x-3 gap-y-1 sm:grid-cols-6">
                          <span className="font-semibold break-words sm:col-span-2">
                            {term.label}
                          </span>
                          <span className="font-mono text-sm font-normal sm:col-span-2">
                            {term.dates}
                          </span>
                          <span className="font-mono tabular-nums sm:text-right">{term.price}</span>
                          <span className="sm:text-right">
                            {term.isFull ? (
                              <Badge variant="warning">Náhradník</Badge>
                            ) : (
                              <Badge variant="outline">{term.availability}</Badge>
                            )}
                          </span>
                        </span>
                      </FieldLabel>
                    </Field>
                  </li>
                ))}
              </ul>
            </FieldSet>
          </Section>

          <Section
            id="f-participant"
            icon={User}
            title="Účastník"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="f-first-name"
                label="Jméno"
                value={FORM.firstName}
              />
              <TextField
                id="f-last-name"
                label="Příjmení"
                value={FORM.lastName}
              />
              <TextField
                id="f-birth"
                label="Datum narození"
                value={FORM.birthDate}
              />
              <SelectField
                id="f-gender"
                label="Pohlaví"
                options={FORM.genders}
              />
            </div>
          </Section>

          <Section
            id="f-contact"
            icon={Email}
            title="Kontakt na rodiče"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="f-email"
                label="E-mail"
                value={FORM.email}
              />
              <TextField
                id="f-phone"
                label="Telefon"
                value={FORM.phone}
              />
            </div>
          </Section>

          <Section
            id="f-more"
            icon={Information}
            title="Doplňující údaje"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="f-school"
                label="Škola"
                options={FORM.schools}
              />
              <FieldSet>
                <FieldLegend variant="label">Oddíl</FieldLegend>
                <RadioGroup>
                  {FORM.troops.map((troop) => (
                    <Field
                      key={troop}
                      orientation="horizontal"
                    >
                      <RadioGroupItem
                        id={`f-troop-${troop}`}
                        value={troop}
                      />
                      <FieldLabel htmlFor={`f-troop-${troop}`}>{troop}</FieldLabel>
                    </Field>
                  ))}
                </RadioGroup>
              </FieldSet>
              <SelectField
                id="f-transport"
                label="Doprava (nepovinné)"
                options={FORM.transport}
              />
              <SelectField
                id="f-diet"
                label="Strava (nepovinné)"
                options={FORM.diets}
              />
            </div>
            <Field>
              <FieldLabel htmlFor="f-health">Zdravotní omezení (nepovinné)</FieldLabel>
              <Textarea id="f-health" />
            </Field>
          </Section>

          <Section
            id="f-conditions"
            icon={Checkmark}
            title="Podmínky účasti"
          >
            <ul className="space-y-2 text-sm">
              {EVENT.conditions.map((condition) => (
                <li
                  key={condition}
                  className="border-l-4 border-border pl-3"
                >
                  {condition}
                </li>
              ))}
            </ul>
            <Field orientation="horizontal">
              <Checkbox id="f-conditions-check" />
              <FieldLabel htmlFor="f-conditions-check">
                Potvrzuji, že jsem si přečetl/a podmínky účasti
              </FieldLabel>
            </Field>
          </Section>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-sidebar p-5 text-sidebar-foreground">
            <p>
              <span className="block font-mono text-xs uppercase">Cena vybraných termínů</span>
              <span className="block font-mono text-3xl font-bold tabular-nums">{FORM.total}</span>
            </p>
            <Button size="lg">Odeslat přihlášku</Button>
          </div>
        </form>
      </main>
    </div>
  )
}
