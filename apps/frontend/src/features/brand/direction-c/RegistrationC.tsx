// Brand → Směr C → Přihláška (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: a poster panel with the event in large type and mono facts (sticky on desktop, on
// top on a phone) next to the form as a numbered document: hairline rows, no boxes.
import type { ReactNode } from "react"
import { RiArrowLeftLine } from "@remixicon/react"

import { BrandMark } from "@/components/BrandMark"
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

function Row({
  number,
  id,
  title,
  children,
}: {
  number: string
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-4 border-t border-foreground py-6"
    >
      <h2
        id={id}
        className="flex items-baseline gap-3 text-2xl"
      >
        <span className="font-mono text-sm text-primary">{number}</span>
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

function Poster() {
  return (
    <div className="space-y-6 bg-foreground p-6 text-background sm:p-10 lg:sticky lg:top-0 lg:min-h-svh dark:bg-card dark:text-card-foreground">
      <p className="font-mono text-xs tracking-widest uppercase">{EVENT.organization}</p>
      <h1 className="text-4xl leading-none sm:text-6xl">{EVENT.name}</h1>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-current pt-6 font-mono text-sm">
        <div>
          <dt className="text-xs uppercase">Kdy</dt>
          <dd>{EVENT.dates}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase">Kde</dt>
          <dd>Hlinsko</dd>
        </div>
        <div>
          <dt className="text-xs uppercase">Pro koho</dt>
          <dd>{EVENT.age}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase">Uzávěrka</dt>
          <dd>31. 5. 2027</dd>
        </div>
      </dl>
      <p className="hidden max-w-md text-base lg:block">{EVENT.summary}</p>
    </div>
  )
}

export function RegistrationC() {
  return (
    <div className="min-h-svh bg-background text-foreground lg:grid lg:grid-cols-2">
      <Poster />
      <div className="px-4 py-6 sm:px-10 lg:py-10">
        <header className="flex items-center justify-between pb-6">
          <BrandMark />
          <Button
            variant="ghost"
            size="sm"
          >
            <RiArrowLeftLine aria-hidden />
            Zpět na detail akce
          </Button>
        </header>

        <form
          aria-label="Přihláška na akci"
          className="max-w-xl"
        >
          <Row
            number="01"
            id="c-terms"
            title="Termíny"
          >
            <FieldSet>
              <FieldLegend className="sr-only">Termíny</FieldLegend>
              <ul className="divide-y border-y">
                {TERMS.map((term) => (
                  <li
                    key={term.id}
                    className="py-3 has-data-[state=checked]:bg-accent"
                  >
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`c-term-${term.id}`}
                        defaultChecked={FORM.selectedTermIds.includes(term.id)}
                      />
                      <FieldLabel
                        htmlFor={`c-term-${term.id}`}
                        className="min-w-0 flex-1"
                      >
                        <span className="grid min-w-0 flex-1 gap-1 sm:grid-cols-3 sm:gap-3">
                          <span className="break-words sm:col-span-2">
                            {term.label}
                            <span className="block font-mono text-xs font-normal">
                              {term.dates}
                              {term.isFull ? " · jen náhradníci" : ` · ${term.availability}`}
                            </span>
                          </span>
                          <span className="font-mono tabular-nums sm:text-right">{term.price}</span>
                        </span>
                      </FieldLabel>
                    </Field>
                  </li>
                ))}
              </ul>
            </FieldSet>
            <p className="flex items-baseline justify-between font-mono">
              <span className="text-sm">Cena vybraných termínů</span>
              <span className="text-xl font-semibold tabular-nums">{FORM.total}</span>
            </p>
          </Row>

          <Row
            number="02"
            id="c-participant"
            title="Účastník"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="c-first-name"
                label="Jméno"
                value={FORM.firstName}
              />
              <TextField
                id="c-last-name"
                label="Příjmení"
                value={FORM.lastName}
              />
              <TextField
                id="c-birth"
                label="Datum narození"
                value={FORM.birthDate}
              />
              <SelectField
                id="c-gender"
                label="Pohlaví"
                options={FORM.genders}
              />
            </div>
          </Row>

          <Row
            number="03"
            id="c-contact"
            title="Kontakt"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="c-email"
                label="E-mail"
                value={FORM.email}
              />
              <TextField
                id="c-phone"
                label="Telefon"
                value={FORM.phone}
              />
            </div>
          </Row>

          <Row
            number="04"
            id="c-questions"
            title="Doplňující údaje"
          >
            <SelectField
              id="c-school"
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
                      id={`c-troop-${troop}`}
                      value={troop}
                    />
                    <FieldLabel htmlFor={`c-troop-${troop}`}>{troop}</FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="c-transport"
                label="Doprava (nepovinné)"
                options={FORM.transport}
              />
              <SelectField
                id="c-diet"
                label="Strava (nepovinné)"
                options={FORM.diets}
              />
            </div>
            <Field>
              <FieldLabel htmlFor="c-health">Zdravotní omezení (nepovinné)</FieldLabel>
              <Textarea id="c-health" />
            </Field>
          </Row>

          <Row
            number="05"
            id="c-conditions"
            title="Podmínky"
          >
            <ol className="space-y-2 font-mono text-sm">
              {EVENT.conditions.map((condition, index) => (
                <li
                  key={condition}
                  className="flex gap-3"
                >
                  <span className="text-muted-foreground">{index + 1}.</span>
                  {condition}
                </li>
              ))}
            </ol>
            <Field orientation="horizontal">
              <Checkbox id="c-conditions-check" />
              <FieldLabel htmlFor="c-conditions-check">
                Potvrzuji, že jsem si přečetl/a podmínky účasti
              </FieldLabel>
            </Field>
          </Row>

          <div className="border-t border-foreground pt-6">
            <Button
              size="lg"
              className="w-full max-w-sm"
            >
              Odeslat přihlášku
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
