import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { fn } from "storybook/test"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Button } from "@/components/ui/button"

import {
  EventPublicPresentation,
  type EventPublicPresentationProps,
  type PresentationPhoto,
} from "@/features/events/components/EventPublicPresentation"
import {
  PublicEventDetail,
  type PublicEventDetailProps,
  type PublicEventDetailTerm,
  type PublicEventPhoto,
} from "@/features/public-events/components/PublicEventDetail"
import {
  PublicEventDetailError,
  PublicEventDetailUnavailable,
} from "@/features/public-events/components/PublicEventDetailStates"

// F55 design reference: public event detail with a link to the registration,
// and the organizer's photos, description, conditions and public contact. The
// same components as the app, with hard-coded values and no API.
// Lives with the screens because it shows components of two features.

function photo(fill: string, hill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="${fill}"/><path d="M0 360V250q160-110 320-30t320-50v190z" fill="${hill}"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const PHOTOS: PublicEventPhoto[] = [
  { src: photo("#bae6fd", "#4d7c0f"), alt: "Tábořiště Modrá Hora v létě" },
  { src: photo("#fde68a", "#15803d"), alt: "Společný oheň u srubu" },
  { src: photo("#c7d2fe", "#166534"), alt: "Hřiště a louka u tábora" },
  { src: photo("#fecaca", "#3f6212"), alt: "Ubytování v chatkách" },
]

const PRESENTATION_PHOTOS: PresentationPhoto[] = PHOTOS.map((item, index) => ({
  id: `photo-${index + 1}`,
  ...item,
}))

const TERM_1: PublicEventDetailTerm = {
  id: "t1",
  label: "Turnus 1",
  dates: "4. 7. – 17. 7. 2027",
  price: "7 900 Kč",
}
const TERM_2: PublicEventDetailTerm = {
  id: "t2",
  label: "Turnus 2",
  dates: "1. 8. – 14. 8. 2027",
  price: "8 400 Kč",
}
const TERMS: PublicEventDetailTerm[] = [TERM_1, TERM_2]

const EVENT: PublicEventDetailProps = {
  publicId: "modra-hora-2027",
  name: "Letní tábor Modrá Hora 2027",
  organizationName: "Spolek Modrá Hora",
  description:
    "Dva týdny her, sportu a života v přírodě pro děti z celého kraje. Program vedou zkušení vedoucí, spí se v chatkách a o jídlo je postaráno.\n\nTábor leží u lesa nad Hlinskem, s hřištěm, ohništěm a koupáním v nedalekém rybníku.",
  location: "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko",
  photos: PHOTOS,
  terms: TERMS,
  conditions: [
    "Věk účastníka 11 až 15 let.",
    "Zdravotní způsobilost potvrzená rodičem při přihlášce.",
    "Záloha 2 000 Kč je splatná do 7 dnů od přihlášení.",
  ],
  contact: { name: "Jana Nováková", email: "tabor@modrahora.example", phone: "+420 604 123 456" },
  registrationStatus: "open",
}

function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header userMenu={<Button size="sm">Přihlásit se</Button>} />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="self-start"
        >
          <Link to={ROUTES.catalog}>
            <ArrowLeft aria-hidden />
            Katalog akcí
          </Link>
        </Button>
        {children}
      </main>
    </div>
  )
}

function Detail(overrides: Partial<PublicEventDetailProps> = {}) {
  return (
    <PublicPage>
      <PublicEventDetail
        {...EVENT}
        {...overrides}
      />
    </PublicPage>
  )
}

const meta = {
  title: "Designs/F55 Public event detail",
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "desktop" } },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

/** Open registration: photos, place, terms with prices, contact, conditions and the link to the registration. */
export const OpenRegistration: Story = { render: () => Detail() }

/** The organizer allows public free spots; one term is full and takes substitutes only. */
export const FreeSpotsAndWaitlist: Story = {
  render: () =>
    Detail({
      terms: [
        { ...TERM_1, freeSpots: "Volná místa: 12" },
        { ...TERM_2, isWaitlist: true },
      ],
    }),
}

/** No photos and no public contact: no broken image and no invented data. */
export const NoPhotosNoContact: Story = { render: () => Detail({ photos: [], contact: null }) }

/** Registration is not open yet: the reason is explained and no submit is offered. */
export const RegistrationNotOpen: Story = {
  render: () => Detail({ registrationStatus: "not-open" }),
}

/** Registration is closed: the event stays visible, no submit is offered. */
export const RegistrationClosed: Story = {
  render: () => Detail({ registrationStatus: "closed" }),
}

/** The event has no terms yet. */
export const NoTerms: Story = {
  render: () => Detail({ terms: [], registrationStatus: "no-terms" }),
}

/** Unpublished, unknown or unavailable event: the same state, no event data. */
export const Unavailable: Story = {
  render: () => (
    <PublicPage>
      <PublicEventDetailUnavailable />
    </PublicPage>
  ),
}

/** Loading failed: an error with retry, not a missing event. */
export const LoadFailed: Story = {
  render: () => (
    <PublicPage>
      <PublicEventDetailError onRetry={fn()} />
    </PublicPage>
  ),
}

function OrganizerPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header userMenu={<Button size="sm">Odhlásit se</Button>} />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <h1 className="text-h2">Nastavení akce</h1>
        {children}
      </main>
    </div>
  )
}

const PRESENTATION = {
  description: EVENT.description,
  conditions: EVENT.conditions.join("\n"),
  contactName: "Jana Nováková",
  contactEmail: "tabor@modrahora.example",
  contactPhone: "+420 604 123 456",
}

function Presentation(overrides: Partial<EventPublicPresentationProps> = {}) {
  return (
    <OrganizerPage>
      <EventPublicPresentation
        initialValues={PRESENTATION}
        photos={PRESENTATION_PHOTOS}
        onSubmit={fn()}
        onAddPhoto={fn()}
        onRemovePhoto={fn()}
        {...overrides}
      />
    </OrganizerPage>
  )
}

/** Organizer: saved description, conditions, photos and public contact. */
export const OrganizerPresentation: Story = { render: () => Presentation() }

/** Organizer: no photos, conditions or public contact yet; the description comes from the event. */
export const OrganizerPresentationEmpty: Story = {
  render: () =>
    Presentation({
      initialValues: {
        ...PRESENTATION,
        conditions: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      },
      photos: [],
    }),
}

/** Organizer: empty description and invalid contact are flagged at the field. */
export const OrganizerPresentationInvalid: Story = {
  render: () =>
    Presentation({
      initialValues: { ...PRESENTATION, description: "", contactEmail: "tabor@modrahora" },
      fieldErrors: { description: "Vyplňte popis.", contactEmail: "Zadejte platný e-mail." },
    }),
}

/** Organizer: saving failed; entered values stay. */
export const OrganizerPresentationSaveFailed: Story = {
  render: () =>
    Presentation({
      errorMessage: "Veřejnou prezentaci se nepodařilo uložit. Zkuste to prosím znovu.",
    }),
}
