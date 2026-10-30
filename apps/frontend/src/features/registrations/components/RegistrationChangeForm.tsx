import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { type ParticipationStatus } from "@/features/registrations/api/registrationSchemas"
import { ParticipationBadge } from "@/features/registrations/components/ParticipationBadge"

export type ContactValues = { firstName: string; lastName: string; email: string; phone: string }

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

export type RegistrationChangeFormProps = {
  contact: ContactValues
  terms: ChangeableTerm[]
}

// Moje přihlášky → Detail přihlášky → Úprava přihlášky (F35-2a): personal and
// contact data in the scope of the registration form, a move to another term
// of the same event, and cancelling single terms. "Zkontrolovat změny" opens
// the review. Design only: every value is passed in.
export function RegistrationChangeForm({ contact, terms }: RegistrationChangeFormProps) {
  return (
    <form
      noValidate
      aria-label="Úprava přihlášky"
      className="space-y-6"
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
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="change-last-name">Příjmení</FieldLabel>
                <Input
                  id="change-last-name"
                  autoComplete="family-name"
                  defaultValue={contact.lastName}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="change-email">E-mail</FieldLabel>
                <Input
                  id="change-email"
                  type="email"
                  autoComplete="email"
                  defaultValue={contact.email}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="change-phone">Telefon</FieldLabel>
                <Input
                  id="change-phone"
                  type="tel"
                  autoComplete="tel"
                  defaultValue={contact.phone}
                />
              </Field>
            </div>
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
                  <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                    <Field>
                      <FieldLabel htmlFor={`change-term-${term.id}`}>Termín</FieldLabel>
                      <Select
                        defaultValue={term.selectedTermId}
                        disabled={term.isCancelled}
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
                    </Field>
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`cancel-term-${term.id}`}
                        defaultChecked={term.isCancelled}
                      />
                      <FieldLabel htmlFor={`cancel-term-${term.id}`}>
                        Odhlásit z termínu {term.label}
                      </FieldLabel>
                    </Field>
                  </div>
                </FieldSet>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
        >
          Zrušit
        </Button>
        <Button type="button">Zkontrolovat změny</Button>
      </div>
    </form>
  )
}
