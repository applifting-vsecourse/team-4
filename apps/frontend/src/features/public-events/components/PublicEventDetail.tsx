import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Info, Mail, MapPin, Phone } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

export type PublicEventContact = { name: string; email: string; phone?: string }

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

function PhotoGallery({ photos }: { photos: PublicEventPhoto[] }) {
  // A photo that fails to load is left out instead of showing a broken image.
  const [failed, setFailed] = useState<string[]>([])
  const [first, ...rest] = photos.filter((photo) => !failed.includes(photo.src))
  if (!first) return null
  const hide = (photo: PublicEventPhoto) => () => setFailed((sources) => [...sources, photo.src])
  return (
    <ul className="grid grid-cols-3 gap-2">
      <li className="col-span-3">
        <img
          src={first.src}
          alt={first.alt}
          onError={hide(first)}
          className="aspect-video w-full rounded-lg object-cover"
        />
      </li>
      {rest.map((photo) => (
        <li key={photo.src}>
          <img
            src={photo.src}
            alt={photo.alt}
            onError={hide(photo)}
            className="aspect-video w-full rounded-md object-cover"
          />
        </li>
      ))}
    </ul>
  )
}

function TermList({ terms }: { terms: PublicEventDetailTerm[] }) {
  return (
    <ul className="divide-y divide-border">
      {terms.map((term) => (
        <li
          key={term.id}
          className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="font-medium break-words">{term.label}</p>
            <p className="text-sm text-muted-foreground">{term.dates}</p>
            <div className="mt-1 flex flex-wrap gap-1.5 empty:hidden">
              {term.isWaitlist ? <Badge variant="warning">Náhradník</Badge> : null}
              {term.freeSpots ? <Badge variant="outline">{term.freeSpots}</Badge> : null}
            </div>
          </div>
          <p className="shrink-0 font-medium">{term.price}</p>
        </li>
      ))}
    </ul>
  )
}

function RegistrationCard({
  publicId,
  terms,
  status,
}: {
  publicId: string
  terms: PublicEventDetailTerm[]
  status: PublicEventRegistrationStatus
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-h4">Termíny a ceny</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {terms.length > 0 ? <TermList terms={terms} /> : null}
          {status === "open" ? (
            <Button
              asChild
              className="w-full"
            >
              <Link
                to={ROUTES.publicRegistration}
                params={{ publicId }}
              >
                Vyplnit přihlášku
              </Link>
            </Button>
          ) : (
            <p className="flex items-start gap-2 text-sm">
              <Info
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
              />
              <span className="min-w-0 break-words">{STATUS_MESSAGES[status]}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ContactBlock({ contact }: { contact: PublicEventContact | null }) {
  if (!contact) return <p className="text-sm">Organizátor veřejný kontakt neuvedl.</p>
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{contact.name}</p>
      <p className="flex items-center gap-2">
        <Mail
          aria-hidden
          className="size-4 shrink-0"
        />
        <a
          href={`mailto:${contact.email}`}
          className="break-all underline"
        >
          {contact.email}
        </a>
      </p>
      {contact.phone ? (
        <p className="flex items-center gap-2">
          <Phone
            aria-hidden
            className="size-4 shrink-0"
          />
          <a
            href={`tel:${contact.phone.replaceAll(" ", "")}`}
            className="underline"
          >
            {contact.phone}
          </a>
        </p>
      ) : null}
    </div>
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
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-h2 break-words">{name}</h1>
        <p className="text-sm font-medium">{organizationName}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin
            aria-hidden
            className="size-4 shrink-0"
          />
          <span className="min-w-0 break-words">{location}</span>
        </p>
      </header>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="min-w-0 space-y-8 md:col-span-2">
          <PhotoGallery photos={photos} />
          <section aria-labelledby="event-description">
            <h2
              id="event-description"
              className="mb-3 text-h4"
            >
              O akci
            </h2>
            <p className="max-w-prose text-sm whitespace-pre-line">{description}</p>
          </section>
          <section aria-labelledby="event-conditions">
            <h2
              id="event-conditions"
              className="mb-3 text-h4"
            >
              Podmínky účasti
            </h2>
            {conditions.length > 0 ? (
              <ul className="max-w-prose list-disc space-y-1 pl-5 text-sm">
                {conditions.map((condition, index) => (
                  <li
                    key={index}
                    className="break-words"
                  >
                    {condition}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">Organizátor podmínky účasti neuvedl.</p>
            )}
          </section>
          <section aria-labelledby="event-contact">
            <h2
              id="event-contact"
              className="mb-3 text-h4"
            >
              Kontakt na organizátora
            </h2>
            <ContactBlock contact={contact} />
          </section>
        </div>
        <aside className="md:sticky md:top-20 md:self-start">
          <RegistrationCard
            publicId={publicId}
            terms={terms}
            status={registrationStatus}
          />
        </aside>
      </div>
    </article>
  )
}
