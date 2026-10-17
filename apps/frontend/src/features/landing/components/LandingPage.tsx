import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import logoUrl from "@/assets/akcio-logo.png"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { InfoCard } from "./InfoCard"
import { LandingSection } from "./LandingSection"

// Sections follow the wireframe (Figma 72:7549 / 72:7208); hero copy is the text
// approved in S2-01. Only what Sprint 2 delivers: no public catalog, adult
// participants only, rooms and beds without assigning people to rooms.

const EVENT_EXAMPLES = [
  { title: "Tábor", text: "Přihlášky, ubytování, kapacity a přehled účastníků na jednom místě." },
  {
    title: "Soustředění",
    text: "Přehled přihlášek, platby a kapacity pro sportovní a vzdělávací akce.",
  },
  {
    title: "Firemní výjezd",
    text: "Přihlášky, ubytování a přehled účastníků pro firemní akce a teambuilding.",
  },
  {
    title: "Letní škola",
    text: "Přehled přihlášek, kapacity a důležité informace pro vzdělávací programy.",
  },
]

const BENEFITS = [
  {
    title: "Přihlášky",
    text: "Účastníci se přihlásí online na vybrané termíny. Přihlášky se potvrzují podle volné kapacity.",
  },
  {
    title: "Ubytování",
    text: "Evidence pokojů a lůžek, ze které vychází kapacita jednotlivých termínů.",
  },
  { title: "Kapacity", text: "Obsazenost a volná místa po termínech na jednom místě." },
  {
    title: "Platby",
    text: "Platební instrukce k přihlášce a evidence přijatých plateb. Pořadatel i účastník vidí stejný stav úhrady.",
  },
]

const PARTICIPANT_STEPS = [
  {
    title: "Otevřete odkaz na akci",
    text: "Pořadatel vám pošle přímý odkaz na přihlášku ke své akci.",
  },
  {
    title: "Vyplňte přihlášku",
    text: "Zadejte své údaje a vyberte jeden nebo více termínů. Cenu výběru vidíte hned.",
  },
  {
    title: "Sledujte svou účast",
    text: "Uvidíte, které termíny máte potvrzené a kde jste náhradník, kolik a kam zaplatit. Později se k přehledu vrátíte přes Moje přihlášky.",
  },
]

const ORGANIZER_STEPS = [
  {
    title: "Založte organizaci",
    text: "Zaregistrujte se jako organizátor a založte svou organizaci. Organizací můžete mít několik.",
  },
  {
    title: "Připravte akci",
    text: "Zadejte termíny s cenami, pokoje s lůžky a účet pro platby.",
  },
  {
    title: "Otevřete přihlašování",
    text: "Rozešlete přímý odkaz na přihlášku. Sledujte obsazenost a zapisujte přijaté platby.",
  },
]

// Placeholders until PO delivers contact details and legal texts.
const FOOTER_PLACEHOLDERS = [
  "Kontakt",
  "Kontaktní údaje dodá PO",
  "Ochrana osobních údajů",
  "Podmínky použití",
]

const CTA_CLASS = "w-full sm:w-52"

export function LandingPage() {
  return (
    <div
      lang="cs"
      className="min-h-svh bg-background text-foreground"
    >
      <Button
        asChild
        variant="outline"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        <a href="#obsah">Přeskočit na obsah</a>
      </Button>

      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-280 items-center justify-between gap-3 px-4 py-4 md:px-8">
          <Link
            to={ROUTES.home}
            className="flex w-fit items-center gap-2 rounded-sm text-h3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <BrandMark />
            akc.io
          </Link>
          <ThemeSwitcher />
        </div>
      </header>

      <main
        id="obsah"
        tabIndex={-1}
        className="outline-none"
      >
        <LandingSection labelledBy="uvod-nadpis">
          <p className="text-sm font-medium text-muted-foreground">Platforma pro akce a tábory</p>
          <h1
            id="uvod-nadpis"
            className="max-w-190 text-h1"
          >
            Přihlášky, ubytování a platby pro vaše akce na jednom místě
          </h1>
          <p className="max-w-190 text-base text-muted-foreground">
            Pořadatelé spravují termíny, kapacitu a přijaté platby. Účastníci se přihlásí online a
            mají přehled o své účasti a úhradě.
          </p>
          <nav aria-label="Vstup do aplikace">
            <EntryButtons />
          </nav>
          <ul className="flex max-w-190 flex-col gap-1 text-sm text-muted-foreground">
            <li>Organizátor: přihlášení e-mailem a heslem, nebo registrace nového organizátora.</li>
            <li>Moje přihlášky: pro účastníky, přístup odkazem zaslaným na e-mail, bez hesla.</li>
          </ul>
        </LandingSection>

        <LandingSection
          labelledBy="pro-koho-nadpis"
          isMuted
        >
          <h2
            id="pro-koho-nadpis"
            className="text-h2"
          >
            Jedno místo, dvě cesty
          </h2>
          {/* foreground, not muted-foreground: muted text fails AA on bg-muted (DESIGN.md) */}
          <p className="text-sm">Ať se chcete zúčastnit, nebo něco uspořádat, začněte na akc.io.</p>
          <ul className="grid gap-4 md:grid-cols-2">
            <li>
              <InfoCard title="Pro účastníky">
                Přihlaste se na akci přes odkaz od pořadatele. Stav své účasti a platební instrukce
                pak najdete v části Moje přihlášky.
              </InfoCard>
            </li>
            <li>
              <InfoCard title="Pro pořadatele">
                Připravujete akci nebo tábor? Nastavte termíny a ubytování, otevřete přihlašování a
                mějte přehled o obsazenosti a platbách.
              </InfoCard>
            </li>
          </ul>
        </LandingSection>

        <LandingSection labelledBy="priklady-nadpis">
          <div className="flex flex-col gap-2">
            <h2
              id="priklady-nadpis"
              className="text-h2"
            >
              Nejen pro tábory
            </h2>
            <p className="text-sm text-muted-foreground">
              Příklady využití platformy. Dostupné možnosti se řídí aktuálním rozsahem služby.
            </p>
          </div>
          <CardGrid items={EVENT_EXAMPLES} />
        </LandingSection>

        <LandingSection labelledBy="prinosy-nadpis">
          <h2
            id="prinosy-nadpis"
            className="text-h2"
          >
            Méně hledání, více přehledu
          </h2>
          <CardGrid items={BENEFITS} />
          <div className="flex flex-col gap-3 rounded-lg bg-muted p-4">
            <h3 className="text-h4">Přínos pro účastníka</h3>
            <p className="text-sm">
              Účastník najde stav své přihlášky a důležité informace na jednom místě.
            </p>
          </div>
        </LandingSection>

        <Separator />

        <LandingSection labelledBy="ucastnik-nadpis">
          <StepsHeader
            id="ucastnik-nadpis"
            audience="Pro účastníka"
            title="Jak se zúčastnit"
          />
          <StepList steps={PARTICIPANT_STEPS} />
          <div>
            <MyRegistrationsButton />
          </div>
        </LandingSection>

        <LandingSection
          labelledBy="poradatel-nadpis"
          isMuted
        >
          <StepsHeader
            id="poradatel-nadpis"
            audience="Pro pořadatele"
            title="Jak uspořádat akci"
            isOnMuted
          />
          <StepList steps={ORGANIZER_STEPS} />
          <div>
            <OrganizerButton />
          </div>
        </LandingSection>

        <LandingSection labelledBy="vyzva-nadpis">
          <h2
            id="vyzva-nadpis"
            className="text-h2"
          >
            Co bude vaše další akce?
          </h2>
          <p className="text-sm text-muted-foreground">
            Připravte vlastní akci, nebo se podívejte na přehled svých přihlášek.
          </p>
          <EntryButtons />
        </LandingSection>
      </main>

      <Separator />

      <footer className="py-10 md:py-14">
        <div className="mx-auto flex w-full max-w-280 flex-col gap-6 px-4 md:flex-row md:justify-between md:px-8">
          <div className="flex flex-col gap-2 md:max-w-92">
            <p className="flex items-center gap-2 text-h3">
              <BrandMark />
              akc.io
            </p>
            <p className="text-sm text-muted-foreground">Přihlášky, ubytování a platby pro akce.</p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:gap-6">
            {FOOTER_PLACEHOLDERS.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  )
}

// Decorative: the "akc.io" text next to it is the accessible name.
function BrandMark() {
  return (
    <img
      src={logoUrl}
      alt=""
      width={32}
      height={32}
      className="size-8"
    />
  )
}

// The two S2-01 entries.
function EntryButtons() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <OrganizerButton isPrimary />
      <MyRegistrationsButton />
    </div>
  )
}

function OrganizerButton({ isPrimary = false }: { isPrimary?: boolean }) {
  return (
    <Button
      asChild
      variant={isPrimary ? "default" : "outline"}
      size="lg"
      className={CTA_CLASS}
    >
      {/* Login offers organizer signup too. */}
      <Link to={ROUTES.login}>Organizátor</Link>
    </Button>
  )
}

// Participant magic-link access is S2-13; link it here once that route exists.
function MyRegistrationsButton() {
  return (
    <Button
      variant="outline"
      size="lg"
      className={CTA_CLASS}
      disabled
    >
      Moje přihlášky
    </Button>
  )
}

type CardItem = { title: string; text: string }

function CardGrid({ items }: { items: CardItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.title}>
          <InfoCard title={item.title}>{item.text}</InfoCard>
        </li>
      ))}
    </ul>
  )
}

type StepsHeaderProps = {
  id: string
  audience: string
  title: string
  isOnMuted?: boolean
}

function StepsHeader({ id, audience, title, isOnMuted = false }: StepsHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <p
        className={isOnMuted ? "text-sm font-medium" : "text-sm font-medium text-muted-foreground"}
      >
        {audience}
      </p>
      <h2
        id={id}
        className="text-h2"
      >
        {title}
      </h2>
    </div>
  )
}

function StepList({ steps }: { steps: CardItem[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title}>
          <InfoCard
            eyebrow={`Krok ${index + 1}`}
            title={step.title}
          >
            {step.text}
          </InfoCard>
        </li>
      ))}
    </ol>
  )
}
