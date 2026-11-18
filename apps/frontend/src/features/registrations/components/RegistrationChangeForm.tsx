import { useState } from "react"

import { FormError } from "@/components/FormError"
import { Notice } from "@/components/Notice"
import { ParticipationBadge } from "@/components/ParticipationBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type TermParticipation } from "@/lib/participation"

import {
  type Gender,
  type GenderAnswer,
  type RegistrationNeeds,
} from "@/features/registrations/api/registrationSchemas"
import { GenderField } from "@/features/registrations/components/GenderField"
import { RegistrationNeedsFields } from "@/features/registrations/components/RegistrationNeedsFields"
import { type RegistrationNeedsErrors } from "@/features/registrations/lib/registrationNeeds"

export type ContactValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  /** Voluntary answer for accommodation (F64); null is "not answered". */
  gender: Gender | null
  /** Own words for "Jiná odpověď"; null when none. */
  genderOther: string | null
}

/**
 * A term of the event in the one list of terms (F35-2c). A held term is
 * preselected and carries its participation; unticking it cancels it. Another
 * term is ticked to add it next to the held ones.
 */
export type FormTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "20. 11. – 22. 11. 2026 · 2 400 Kč". */
  details: string
  /** The participation in a held term; null for a term the registration does not hold. */
  status: TermParticipation | null
}

export type ContactErrors = Partial<Record<"firstName" | "lastName" | "phone", string>>

export type RegistrationChangeFormProps = {
  contact: ContactValues
  /** Every term of the event, by start. */
  terms: FormTerm[]
  /** Transport, diet and health (F63), for the whole registration. */
  needs: RegistrationNeeds
  /** Fields are uncontrolled; these report every edit to the page that owns the state. */
  onContactChange?: (field: "firstName" | "lastName" | "phone", value: string) => void
  onGenderChange?: (answer: GenderAnswer) => void
  onNeedsChange?: (needs: RegistrationNeeds) => void
  /** Reports every term that is ticked after each edit. */
  onSelectedTermsChange?: (termIds: string[]) => void
  onReview?: () => void
  onCancel?: () => void
  errors?: ContactErrors
  needsErrors?: RegistrationNeedsErrors
  /** Shown above the buttons, e.g. "Nic jste nezměnili". */
  errorMessage?: string
}

// Moje přihlášky → Detail přihlášky → Úprava přihlášky (F35-2a): personal and
// contact data in the scope of the registration form, one list of the event's
// terms (held ones preselected: untick to cancel, tick another to add it,
// F35-2c), and transport, diet and health (F63).
// "Zkontrolovat změny" opens the review. Every value is passed in.
export function RegistrationChangeForm({
  contact,
  terms,
  needs,
  onContactChange,
  onGenderChange,
  onNeedsChange,
  onSelectedTermsChange,
  onReview,
  onCancel,
  errors = {},
  needsErrors,
  errorMessage,
}: RegistrationChangeFormProps) {
  const [gender, setGender] = useState<GenderAnswer>({
    gender: contact.gender,
    genderOther: contact.genderOther,
  })
  const chooseGender = (next: GenderAnswer) => {
    setGender(next)
    onGenderChange?.(next)
  }
  const [selected, setSelected] = useState<string[]>(() =>
    terms.filter((term) => term.status !== null).map((term) => term.id),
  )
  const toggle = (termId: string, isSelected: boolean) => {
    const next = isSelected ? [...selected, termId] : selected.filter((id) => id !== termId)
    setSelected(next)
    onSelectedTermsChange?.(next)
  }
  const isEveryTermHeld = terms.every((term) => term.status !== null)
  // What the selection does, shown as soon as it differs from the held terms.
  const addedLabels = terms
    .filter((term) => term.status === null && selected.includes(term.id))
    .map((term) => term.label)
    .join(", ")
  const removedLabels = terms
    .filter((term) => term.status !== null && !selected.includes(term.id))
    .map((term) => term.label)
    .join(", ")
  const isEverythingRemoved = selected.length === 0

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
                  className="h-6 items-center"
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
                <FieldLabel
                  htmlFor="change-phone"
                  className="h-6 items-center"
                >
                  Telefon
                </FieldLabel>
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
          <FieldGroup>
            {terms.map((term) => (
              <Field
                key={term.id}
                orientation="horizontal"
              >
                <Checkbox
                  id={`term-${term.id}`}
                  defaultChecked={term.status !== null}
                  onCheckedChange={(checked) => toggle(term.id, checked === true)}
                />
                <FieldLabel htmlFor={`term-${term.id}`}>
                  <span className="flex flex-col gap-1">
                    <span>{term.label}</span>
                    <span className="font-normal text-muted-foreground">{term.details}</span>
                  </span>
                </FieldLabel>
                {term.status ? <ParticipationBadge status={term.status} /> : null}
              </Field>
            ))}
          </FieldGroup>
          {addedLabels || removedLabels ? (
            <div className="mt-6 space-y-3">
              {addedLabels ? (
                <Notice
                  tone="info"
                  role="status"
                  title={`Přidání termínu ${addedLabels}`}
                >
                  Stávající termíny zůstanou. Účast se vyhodnotí podle kapacity: při volném místě
                  bude potvrzena, jinak budete náhradníkem. Cena se přičte po potvrzení místa.
                </Notice>
              ) : null}
              {isEverythingRemoved ? (
                <Notice
                  tone="warning"
                  role="status"
                  title="Odhlášení ze všech termínů"
                >
                  Celá přihláška bude odhlášená. Storno poplatek řeší organizátor podle podmínek
                  akce.
                </Notice>
              ) : removedLabels ? (
                <Notice
                  tone="info"
                  role="status"
                  title={`Odhlášení z termínu ${removedLabels}`}
                >
                  Místo se uvolní a storno poplatek řeší organizátor podle podmínek akce.
                </Notice>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Změny uvidíte v přehledu a potvrdíte je až tam. U termínů blízko začátku je může
                muset schválit organizátor.
              </p>
            </div>
          ) : null}
          {isEveryTermHeld ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Další termín není k dispozici, na přihlášce už máte všechny termíny akce.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doprava, strava a zdraví</CardTitle>
        </CardHeader>
        <CardContent>
          <RegistrationNeedsFields
            defaultValue={needs}
            onChange={onNeedsChange}
            errors={needsErrors}
          />
        </CardContent>
      </Card>

      {errorMessage ? <FormError message={errorMessage} /> : null}

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
