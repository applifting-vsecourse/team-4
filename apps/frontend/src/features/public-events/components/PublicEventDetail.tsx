import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Notice } from "@/components/Notice"
import { PageHeader } from "@/components/PageHeader"
import { PageSection } from "@/components/PageSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Veřejný katalog akcí → Detail akce (F55). Every value is passed in already
// formatted; see `toPublicEventDetail` for the API mapping.

export type PublicEventPhoto = { src: string; alt: string }

export type PublicEventDetailTerm = {
  id: string
  label: string
  dates: string
  // Already formatted, e.g. "2 400 Kč".
  price: string
  // Shown only when the organizer allows public free spots, e.g. "Volná místa: 12".
  // No such setting exists yet, so the detail never sets it.
  freeSpots?: string
  // Capacity is full or zero: a registration still lands among the substitutes.
  isWaitlist?: boolean
}

export type PublicEventContact = { name: string | null; email: string | null; phone?: string }

export type PublicEventRegistrationStatus = "open" | "not-open" | "closed" | "no-terms"

export type PublicEventDetailProps = {
  publicId: string
  name: string
  organizationName: string
  description: string
  location: string
  photos: PublicEventPhoto[]
  terms: PublicEventDetailTerm[]
  conditions: string[]
  // The organizer left the public contact empty.
  contact: PublicEventContact | null
  registrationStatus: PublicEventRegistrationStatus
}

const STATUS_MESSAGES: Record<Exclude<PublicEventRegistrationStatus, "open">, string> = {
  "not-open": "Registrace zatím není otevřená",
  closed: "Registrace je uzavřená",
  "no-terms": "Zatím se nelze přihlásit",
}

function TermList({ terms }: { terms: PublicEventDetailTerm[] }) {
  const isSingleTerm = terms.length === 1
  return (
    <PageSection
      title={isSingleTerm ? "Termín a cena" : "Termíny a ceny"}
      className="space-y-2 rounded-lg bg-secondary px-4 py-3 text-secondary-foreground"
    >
      <ul className="space-y-3">
        {terms.map((term) => (
          <li
            key={term.id}
            className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"
          >
            <div className="min-w-0">
              <p className="font-semibold wrap-break-word">
                {isSingleTerm ? term.dates : term.label}
              </p>
              <p className="text-sm wrap-break-word text-muted-foreground">
                {isSingleTerm ? term.label : term.dates}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5 empty:hidden">
                {term.isWaitlist ? <Badge variant="warning">Náhradník</Badge> : null}
                {term.freeSpots ? <Badge variant="outline">{term.freeSpots}</Badge> : null}
              </div>
            </div>
            <span className="font-mono font-semibold tabular-nums">{term.price}</span>
          </li>
        ))}
      </ul>
    </PageSection>
  )
}

function RegistrationSummary({
  publicId,
  terms,
  status,
}: {
  publicId: string
  terms: PublicEventDetailTerm[]
  status: PublicEventRegistrationStatus
}) {
  return (
    <aside
      aria-label="Přihláška"
      className="space-y-4"
    >
      {terms.length > 0 ? <TermList terms={terms} /> : null}
      {status === "open" ? (
        <Button
          asChild
          size="lg"
          className="w-full max-w-sm md:w-auto"
        >
          <Link
            to={ROUTES.publicRegistration}
            params={{ publicId }}
          >
            Vyplnit přihlášku <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <Notice
          tone="info"
          title={STATUS_MESSAGES[status]}
        />
      )}
    </aside>
  )
}

function ContactBlock({ contact }: { contact: PublicEventContact }) {
  return (
    <PageSection
      title="Kontakt na organizátora"
      className="self-start rounded-xl bg-muted p-5 text-foreground md:p-6 dark:bg-card dark:text-card-foreground"
    >
      <ul className="space-y-2 text-sm">
        {contact.name ? <li className="font-medium wrap-break-word">{contact.name}</li> : null}
        {contact.email ? (
          <li className="flex items-start gap-2">
            <Mail
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
            />
            <a
              href={`mailto:${contact.email}`}
              className="wrap-anywhere underline underline-offset-4"
            >
              {contact.email}
            </a>
          </li>
        ) : null}
        {contact.phone ? (
          <li className="flex items-start gap-2">
            <Phone
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
            />
            <a
              href={`tel:${contact.phone.replaceAll(" ", "")}`}
              className="underline underline-offset-4"
            >
              {contact.phone}
            </a>
          </li>
        ) : null}
      </ul>
    </PageSection>
  )
}

export function PublicEventDetail({
  publicId,
  name,
  organizationName,
  description,
  location,
  photos,
  terms,
  conditions,
  contact,
  registrationStatus,
}: PublicEventDetailProps) {
  // Promote the next usable photo or collapse the gallery when none can load.
  const [failedPhotos, setFailedPhotos] = useState<string[]>([])
  const [cover, ...gallery] = photos.filter((photo) => !failedPhotos.includes(photo.src))
  const hidePhoto = (src: string) => setFailedPhotos((failed) => [...failed, src])
  const hasContact = contact && [contact.name, contact.email, contact.phone].some(Boolean)
  const hasContactColumn = Boolean(cover && hasContact)

  return (
    <article className={cn("space-y-5 md:space-y-6", !cover && "max-w-xl")}>
      <Card
        padding="none"
        className="overflow-hidden"
      >
        <div className={cn("grid", cover && "md:grid-cols-2 lg:grid-cols-9")}>
          <div className={cn("min-w-0 p-5 sm:p-7 lg:p-8", cover && "lg:col-span-4")}>
            <PageHeader
              title={
                <span className="block text-balance md:text-h1 md:font-extrabold">{name}</span>
              }
              description={
                <div className="space-y-2 pt-1">
                  <p className="font-medium text-foreground">{organizationName}</p>
                  <p className="flex items-start gap-2">
                    <MapPin
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0"
                    />
                    <span className="wrap-break-word">{location}</span>
                  </p>
                </div>
              }
            />
            <RegistrationSummary
              publicId={publicId}
              terms={terms}
              status={registrationStatus}
            />
          </div>
          {cover ? (
            <div className="relative min-w-0 bg-muted md:min-h-80 lg:col-span-5">
              <img
                src={cover.src}
                alt={cover.alt}
                onError={() => hidePhoto(cover.src)}
                className="block aspect-video w-full object-cover md:absolute md:inset-0 md:aspect-auto md:size-full"
              />
            </div>
          ) : null}
        </div>
      </Card>

      {gallery.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {gallery.map((photo) => (
            <li key={photo.src}>
              <img
                src={photo.src}
                alt={photo.alt}
                onError={() => hidePhoto(photo.src)}
                className="aspect-video w-full rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div className={cn("grid gap-5 md:gap-6", hasContactColumn && "md:grid-cols-3")}>
        <div
          className={cn(
            "min-w-0 space-y-5 rounded-xl bg-card p-5 text-card-foreground md:p-6",
            hasContactColumn && "md:col-span-2",
          )}
        >
          <PageSection title="O akci">
            <p className="max-w-prose leading-relaxed wrap-break-word whitespace-pre-line">
              {description}
            </p>
          </PageSection>
          {conditions.length > 0 ? (
            <PageSection title="Podmínky účasti">
              <ul className="max-w-prose list-disc space-y-1 pl-5 text-sm">
                {conditions.map((condition, index) => (
                  <li
                    key={index}
                    className="wrap-break-word"
                  >
                    {condition}
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}
        </div>
        {hasContact ? <ContactBlock contact={contact} /> : null}
      </div>
    </article>
  )
}
