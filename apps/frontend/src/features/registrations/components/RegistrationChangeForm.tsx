import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  type Gender,
  type ParticipationStatus,
} from "@/features/registrations/api/registrationSchemas"
import { GenderField } from "@/features/registrations/components/GenderField"
import { ParticipationBadge } from "@/features/registrations/components/ParticipationBadge"

export type ContactValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  /** Voluntary answer for accommodation (F64); null is "not answered". */
  gender: Gender | null
}

/** A term of the same event the participant may move to. */
export type TermOption = {
  id: string
  /** Already formatted, e.g. "Turnus 3 · 4. 12. – 6. 12. 2026 · 2 900 Kč · obsazeno". */
  label: string
}

/** An active term of the registration and what the participant chose for it. */
export type ChangeableTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "20. 11. – 22. 11. 2026 · 2 400 Kč". */
  details: string
  status: ParticipationStatus
  /** The current term first, then the other terms of the event. */
  options: TermOption[]
  selectedTermId: string
  isCancelled?: boolean
}

type TermChoice = { selectedTermId: string; isCancelled: boolean }

export type ContactErrors = Partial<Record<"firstName" | "lastName" | "phone", string>>

export type RegistrationChangeFormProps = {
  contact: ContactValues
  terms: ChangeableTerm[]
  /** Fields are uncontrolled; these report every edit to the page that owns the state. */
  onContactChange?: (field: "firstName" | "lastName" | "phone", value: string) => void
  onGenderChange?: (gender: Gender | null) => void
  onTermChange?: (termId: string, change: { selectedTermId: string; isCancelled: boolean }) => void
  onReview?: () => void
  onCancel?: () => void
  errors?: ContactErrors
  /** Shown above the buttons, e.g. "Nic jste nezměnili". */
  errorMessage?: string
}

// Moje přihlášky → Detail přihlášky → Úprava přihlášky (F35-2a): personal and
// contact data in the scope of the registration form, a move to another term
// of the same event, and cancelling single terms. "Zkontrolovat změny" opens
// the review. Design only: every value is passed in.
export function RegistrationChangeForm({
  contact,
  terms,
  onContactChange,
  onGenderChange,
  onTermChange,
  onReview,
  onCancel,
  errors = {},
  errorMessage,
}: RegistrationChangeFormProps) {
  const [gender, setGender] = useState(contact.gender)
  const chooseGender = (next: Gender | null) => {
    setGender(next)
    onGenderChange?.(next)
  }
  const [chosen, setChosen] = useState<Record<string, TermChoice>>(() =>
    Object.fromEntries(
      terms.map((term) => [
        term.id,
        { selectedTermId: term.selectedTermId, isCancelled: term.isCancelled ?? false },
      ]),
    ),
  )
  const choose = (termId: string, change: Partial<TermChoice>) => {
    const next = { selectedTermId: termId, isCancelled: false, ...chosen[termId], ...change }
    setChosen({ ...chosen, [termId]: next })
    onTermChange?.(termId, next)
  }

  return (
    <form
      noValidate
      aria-label="Úprava přihlášky"
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        onReview?.()
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Osobní a kontaktní údaje</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="change-first-name">Jméno</FieldLabel>
                <Input
                  id="change-first-name"
                  autoComplete="given-name"
                  defaultValue={contact.firstName}
                  aria-invalid={errors.firstName ? true : undefined}
                  onChange={(event) => onContactChange?.("firstName", event.target.value)}
                />
                <FieldError>{errors.firstName}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="change-last-name">Příjmení</FieldLabel>
                <Input
                  id="change-last-name"
                  autoComplete="family-name"
                  defaultValue={contact.lastName}
                  aria-invalid={errors.lastName ? true : undefined}
                  onChange={(event) => onContactChange?.("lastName", event.target.value)}
                />
                <FieldError>{errors.lastName}</FieldError>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="change-email"
                  className="items-center"
                >
                  E-mail přihlášení
                  <Badge variant="outline">Neměnný</Badge>
                </FieldLabel>
                <Input
                  id="change-email"
                  type="email"
                  autoComplete="email"
                  defaultValue={contact.email}
                  disabled
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="change-phone">Telefon</FieldLabel>
                <Input
                  id="change-phone"
                  type="tel"
                  autoComplete="tel"
                  defaultValue={contact.phone}
                  aria-invalid={errors.phone ? true : undefined}
                  onChange={(event) => onContactChange?.("phone", event.target.value)}
                />
                <FieldError>{errors.phone}</FieldError>
              </Field>
            </div>
            <GenderField
              id="change-gender"
              value={gender}
              onChange={chooseGender}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Termíny</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {terms.map((term) => (
              <li
                key={term.id}
                className="py-4 first:pt-0 last:pb-0"
              >
                <FieldSet>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLegend>{term.label}</FieldLegend>
                    <ParticipationBadge status={term.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{term.details}</p>
                  <Field>
                    <FieldLabel htmlFor={`change-term-${term.id}`}>Termín</FieldLabel>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <Select
                          defaultValue={term.selectedTermId}
                          disabled={chosen[term.id]?.isCancelled}
                          onValueChange={(selectedTermId) => choose(term.id, { selectedTermId })}
                        >
                          <SelectTrigger id={`change-term-${term.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {term.options.map((option) => (
                              <SelectItem
                                key={option.id}
                                value={option.id}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Field
                        orientation="horizontal"
                        className="sm:w-auto"
                      >
                        <Checkbox
                          id={`cancel-term-${term.id}`}
                          defaultChecked={term.isCancelled}
                          onCheckedChange={(checked) =>
                            choose(term.id, { isCancelled: checked === true })
                          }
                        />
                        <FieldLabel htmlFor={`cancel-term-${term.id}`}>
                          Odhlásit z termínu {term.label}
                        </FieldLabel>
                      </Field>
                    </div>
                  </Field>
                </FieldSet>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Zrušit
        </Button>
        <Button type="submit">Zkontrolovat změny</Button>
      </div>
    </form>
  )
}
