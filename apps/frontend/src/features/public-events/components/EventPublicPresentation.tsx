import { ImagePlus, Trash2, TriangleAlert } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// Správa akce → Nastavení → Veřejná prezentace (F55). Design only: every value is passed in.

export type PresentationPhoto = { id: string; src: string; alt: string }

export type PresentationContactValues = { name: string; email: string; phone: string }

export type EventPublicPresentationProps = {
  /** Shown on the public detail under "O akci". */
  description: string
  descriptionError?: string
  photos: PresentationPhoto[]
  contact: PresentationContactValues
  contactErrors?: Partial<Record<keyof PresentationContactValues, string>>
  isSaving?: boolean
  errorMessage?: string | null
}

export function EventPublicPresentation({
  description,
  descriptionError,
  photos,
  contact,
  contactErrors = {},
  isSaving = false,
  errorMessage = null,
}: EventPublicPresentationProps) {
  return (
    <section aria-labelledby="public-presentation-heading">
      <h2
        id="public-presentation-heading"
        className="mb-4 text-h4"
      >
        Veřejná prezentace
      </h2>
      <Card>
        <CardContent>
          <form className="space-y-8">
            <FieldGroup>
              <h3 className="text-base font-medium">Fotky</h3>
              {photos.length > 0 ? (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {photos.map((photo) => (
                    <li
                      key={photo.id}
                      className="space-y-2"
                    >
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        className="aspect-video w-full rounded-md object-cover"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Trash2 aria-hidden />
                        Odebrat
                        <span className="sr-only"> fotku {photo.alt}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">Zatím nejsou nahrané žádné fotky.</p>
              )}
              <div>
                <Button
                  type="button"
                  variant="outline"
                >
                  <ImagePlus aria-hidden />
                  Přidat fotku
                </Button>
              </div>
            </FieldGroup>

            <FieldGroup>
              <h3 className="text-base font-medium">O akci</h3>
              <Field data-invalid={Boolean(descriptionError)}>
                <FieldLabel htmlFor="event-description">Popis akce</FieldLabel>
                <Textarea
                  id="event-description"
                  rows={6}
                  maxLength={5000}
                  defaultValue={description}
                  aria-invalid={Boolean(descriptionError)}
                />
                <FieldError>{descriptionError}</FieldError>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <h3 className="text-base font-medium">Veřejný kontakt</h3>
              <Field data-invalid={Boolean(contactErrors.name)}>
                <FieldLabel htmlFor="contact-name">Jméno nebo název</FieldLabel>
                <Input
                  id="contact-name"
                  defaultValue={contact.name}
                  aria-invalid={Boolean(contactErrors.name)}
                />
                <FieldError>{contactErrors.name}</FieldError>
              </Field>
              <Field data-invalid={Boolean(contactErrors.email)}>
                <FieldLabel htmlFor="contact-email">E-mail</FieldLabel>
                <Input
                  id="contact-email"
                  type="email"
                  defaultValue={contact.email}
                  aria-invalid={Boolean(contactErrors.email)}
                />
                <FieldError>{contactErrors.email}</FieldError>
              </Field>
              <Field data-invalid={Boolean(contactErrors.phone)}>
                <FieldLabel htmlFor="contact-phone">Telefon</FieldLabel>
                <Input
                  id="contact-phone"
                  type="tel"
                  defaultValue={contact.phone}
                  aria-invalid={Boolean(contactErrors.phone)}
                />
                <FieldError>{contactErrors.phone}</FieldError>
              </Field>
            </FieldGroup>

            {errorMessage ? (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>{errorMessage}</AlertTitle>
              </Alert>
            ) : null}
            <Button
              type="button"
              disabled={isSaving}
            >
              {isSaving ? "Ukládám…" : "Uložit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
