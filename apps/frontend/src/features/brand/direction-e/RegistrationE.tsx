// Brand → Směr E → Přihláška (S5-T03-1, POC). Design only: every value comes from the shared data.
// Composition: a printed event header with a halftone block, then the form in four steps. Done
// steps collapse into a one-line summary with „Změnit“; the step rail shows where the user is.
import type { ReactNode } from "react"
import { Calendar, Check, Group, MapPin, NavArrowLeft } from "iconoir-react"

import { BrandMark } from "@/components/BrandMark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { EVENT, FORM, STEPS, TERMS, type StepNumber } from "@/features/brand/data"

const DONE_SUMMARY: Record<1 | 2 | 3, string> = {
  1: `Turnus 1 · ${FORM.total}`,
  2: `${FORM.firstName} ${FORM.lastName} · ${FORM.email}`,
  3: "ZŠ Lipová · Lišky · společný autobus",
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

function Choices({ name, legend, options }: { name: string; legend: string; options: string[] }) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <RadioGroup className="flex flex-wrap">
        {options.map((option) => (
          <Field
            key={option}
            orientation="horizontal"
          >
            <RadioGroupItem
              id={`${name}-${option}`}
              value={option}
            />
            <FieldLabel htmlFor={`${name}-${option}`}>{option}</FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  )
}

function TermsStep() {
  return (
    <FieldSet>
      <FieldLegend className="sr-only">Termíny</FieldLegend>
      <ul className="space-y-3">
        {TERMS.map((term) => (
          <li
            key={term.id}
            className="rounded-xl border-2 border-dashed border-border p-4 has-data-[state=checked]:border-solid has-data-[state=checked]:border-primary"
          >
            <Field orientation="horizontal">
              <Checkbox
                id={`e-term-${term.id}`}
                defaultChecked={FORM.selectedTermIds.includes(term.id)}
              />
              <FieldLabel
                htmlFor={`e-term-${term.id}`}
                className="min-w-0 flex-1"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="min-w-0 break-words">{term.label}</span>
                  <span className="font-mono tabular-nums">{term.price}</span>
                </span>
              </FieldLabel>
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-2 pl-7 text-sm">
              <span className="font-mono">{term.dates}</span>
              {term.isFull ? (
                <Badge variant="warning">Jen náhradníci</Badge>
              ) : (
                <Badge variant="secondary">{term.availability}</Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </FieldSet>
  )
}

function ParticipantStep() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="e-first-name"
          label="Jméno"
          value={FORM.firstName}
        />
        <TextField
          id="e-last-name"
          label="Příjmení"
          value={FORM.lastName}
        />
        <TextField
          id="e-birth"
          label="Datum narození"
          value={FORM.birthDate}
        />
      </div>
      <Choices
        name="e-gender"
        legend="Pohlaví"
        options={FORM.genders}
      />
      <div className="grid gap-4 border-t border-dashed pt-5 sm:grid-cols-2">
        <TextField
          id="e-email"
          label="E-mail rodiče"
          value={FORM.email}
        />
        <TextField
          id="e-phone"
          label="Telefon rodiče"
          value={FORM.phone}
        />
      </div>
    </div>
  )
}

function DetailsStep() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="e-school"
          label="Škola"
          options={FORM.schools}
        />
        <SelectField
          id="e-transport"
          label="Doprava (nepovinné)"
          options={FORM.transport}
        />
      </div>
      <Choices
        name="e-troop"
        legend="Oddíl"
        options={FORM.troops}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="e-diet"
          label="Strava (nepovinné)"
          options={FORM.diets}
        />
        <Field>
          <FieldLabel htmlFor="e-health">Zdravotní omezení (nepovinné)</FieldLabel>
          <Textarea id="e-health" />
        </Field>
      </div>
    </div>
  )
}

function SummaryStep() {
  return (
    <div className="space-y-5">
      <dl className="divide-y divide-dashed rounded-xl bg-muted px-4 text-sm">
        {([1, 2, 3] as const).map((step) => (
          <div
            key={step}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
          >
            <dt className="font-semibold">{STEPS[step - 1]}</dt>
            <dd className="min-w-0 break-words">{DONE_SUMMARY[step]}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="font-semibold">Cena vybraných termínů</dt>
          <dd className="font-mono text-lg font-bold tabular-nums">{FORM.total}</dd>
        </div>
      </dl>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {EVENT.conditions.map((condition) => (
          <li key={condition}>{condition}</li>
        ))}
      </ol>
      <Field orientation="horizontal">
        <Checkbox id="e-conditions-check" />
        <FieldLabel htmlFor="e-conditions-check">
          Potvrzuji, že jsem si přečetl/a podmínky účasti
        </FieldLabel>
      </Field>
    </div>
  )
}

const STEP_CONTENT: Record<StepNumber, () => ReactNode> = {
  1: TermsStep,
  2: ParticipantStep,
  3: DetailsStep,
  4: SummaryStep,
}

function StepRail({ step }: { step: StepNumber }) {
  return (
    <nav aria-label="Kroky přihlášky">
      <div className="space-y-2 sm:hidden">
        <p className="text-sm font-semibold">
          Krok {step} ze 4 · {STEPS[step - 1]}
        </p>
        <Progress
          value={step * 25}
          aria-label={`Krok ${step} ze 4`}
        />
      </div>
      <ol className="hidden grid-cols-4 gap-3 sm:grid">
        {STEPS.map((title, index) => {
          const number = index + 1
          const isDone = number < step
          const isCurrent = number === step
          return (
            <li
              key={title}
              aria-current={isCurrent ? "step" : undefined}
              className={
                isCurrent
                  ? "space-y-2 border-t-4 border-primary pt-2 text-sm font-semibold"
                  : isDone
                    ? "space-y-2 border-t-4 border-foreground pt-2 text-sm"
                    : "space-y-2 border-t-4 border-dashed border-border pt-2 text-sm text-muted-foreground"
              }
            >
              <span className="flex items-center gap-1.5 font-mono text-xs">
                {isDone ? (
                  <Check
                    aria-hidden
                    className="size-3.5"
                  />
                ) : null}
                0{number}
              </span>
              <span className="block">{title}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function RegistrationE({ step = 2 }: { step?: StepNumber }) {
  const Content = STEP_CONTENT[step]
  const doneSteps = ([1, 2, 3] as const).filter((done) => done < step)
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <BrandMark />
        <Button
          variant="ghost"
          size="sm"
        >
          Přihlásit se
        </Button>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 pb-12">
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
          >
            <NavArrowLeft aria-hidden />
            Zpět na detail akce
          </Button>
          <div className="relative overflow-hidden">
            <div
              aria-hidden
              data-decor="halftone"
              className="absolute top-0 right-0 hidden size-40 rounded-full sm:block"
            />
            <div className="relative space-y-3 sm:pr-48">
              <p className="text-sm font-semibold text-primary">{EVENT.organization}</p>
              <h1 className="text-4xl leading-tight sm:text-5xl">{EVENT.name}</h1>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <li className="flex items-center gap-1.5">
                  <Calendar
                    aria-hidden
                    className="size-4 shrink-0"
                  />
                  {EVENT.dates}
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin
                    aria-hidden
                    className="size-4 shrink-0"
                  />
                  Hlinsko
                </li>
                <li className="flex items-center gap-1.5">
                  <Group
                    aria-hidden
                    className="size-4 shrink-0"
                  />
                  {EVENT.age}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <StepRail step={step} />

        <form
          aria-label="Přihláška na akci"
          className="space-y-4"
        >
          {step < 4
            ? doneSteps.map((done) => (
                <div
                  key={done}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm"
                >
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                    <span className="font-semibold">{STEPS[done - 1]}</span>
                    <span className="min-w-0 break-words">{DONE_SUMMARY[done]}</span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                  >
                    Změnit
                  </Button>
                </div>
              ))
            : null}

          <Card>
            <CardContent>
              <section
                aria-labelledby="e-step-heading"
                className="space-y-6"
              >
                <h2
                  id="e-step-heading"
                  className="text-2xl"
                >
                  {STEPS[step - 1]}
                </h2>
                <Content />
              </section>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {step > 1 ? <Button variant="outline">Zpět</Button> : <span />}
            {step < 4 ? <Button>Pokračovat</Button> : <Button size="lg">Odeslat přihlášku</Button>}
          </div>
        </form>
      </main>
    </div>
  )
}
