import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import logoUrl from "@/assets/akcio-logo.png"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { InfoCard } from "./InfoCard"
import { LandingSection } from "./LandingSection"

// Copy follows the wireframe (Figma 72:7549 / 72:7208) until UX delivers final texts.
// Catalog and participant access are not built yet (catalog is out of Sprint 2,
// participant magic link is S2-13): their buttons stay visible but disabled.

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
  { title: "Přihlášky", text: "Přehled přihlášených účastníků a stavů v jednom místě." },
  { title: "Platby", text: "Přehled stavu úhrad a přehled plateb k akci." },
  { title: "Kapacity", text: "Obsazenost a dostupná místa na jednom místě." },
  // Wireframe says "Rozdělení účastníků do pokojů"; assigning people to rooms is
  // out of Sprint 2, only the room and bed registry is in.
  { title: "Ubytování", text: "Evidence pokojů a lůžek, ze kterých se počítá kapacita termínu." },
]

const PARTICIPANT_STEPS = [
  {
    title: "Prohlédněte si akce",
    text: "Začněte nabídkou veřejných akcí a táborů. Vyberte si, co vás zajímá.",
  },
  {
    title: "Zjistěte podrobnosti",
    text: "Přečtěte si program, termín, místo a podmínky účasti u vybrané akce.",
  },
  {
    title: "Pokračujte k účasti",
    text: "Řiďte se pokyny pořadatele a zjistěte, jak se na akci přihlásit.",
  },
]

const ORGANIZER_STEPS = [
  {
    title: "Začněte jako pořadatel",
    text: "Zvolte cestu pro pořadatele a pokračujte k přípravě vlastní akce.",
  },
  {
    title: "Připravte informace",
    text: "Popište akci nebo tábor. Uveďte program, termín, místo a podmínky účasti.",
  },
  {
    title: "Představte svou akci",
    text: "Zveřejněte informace pro zájemce a dejte jim jasný postup, jak se zúčastnit.",
  },
]

const FOOTER_PLACEHOLDERS = [
  "Kontakt",
  "Kontaktní údaje dodá PO",
  "Ochrana osobních údajů",
  "Podmínky použití",
]

const CTA_CLASS = "w-full sm:w-52"

type LandingPageProps = {
  isSignedIn: boolean
}

export function LandingPage({ isSignedIn }: LandingPageProps) {
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
        <div className="mx-auto flex w-full max-w-280 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <Link
            to={ROUTES.home}
            className="flex w-fit items-center gap-2 rounded-sm text-h3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <BrandMark />
            akc.io
          </Link>
          <nav
            aria-label="Hlavní navigace"
            className="flex flex-wrap items-center gap-2"
          >
            <Button
              variant="ghost"
              size="lg"
              disabled
            >
              Katalog akcí
            </Button>
            <Button
              variant="ghost"
              size="lg"
              disabled
            >
              Přístup pro účastníky
            </Button>
            {isSignedIn ? (
              <Button
                asChild
                variant="ghost"
                size="lg"
              >
                <Link to={ROUTES.dashboard}>Správa akcí</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                >
                  <Link to={ROUTES.login}>Přihlásit se</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                >
                  <Link to={ROUTES.signup}>Registrovat se</Link>
                </Button>
              </>
            )}
            <ThemeSwitcher />
          </nav>
        </div>
      </header>

      <main
        id="obsah"
        tabIndex={-1}
        className="outline-none"
      >
        <section
          aria-labelledby="uvod-nadpis"
          className="py-10 md:py-14"
        >
          <div className="mx-auto flex w-full max-w-280 flex-col gap-6 px-4 md:px-8">
            <p className="text-sm font-medium text-muted-foreground">Platforma pro akce a tábory</p>
            <h1
              id="uvod-nadpis"
              className="max-w-190 text-h1"
            >
              Pobytové i další akce na jednom místě.
            </h1>
            <p className="max-w-190 text-sm text-muted-foreground">
              akc.io pomáhá pořadatelům mít přihlášky, platby, kapacity a ubytování přehledně
              pohromadě. Účastníci najdou stav své přihlášky a důležité informace na jednom místě.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className={CTA_CLASS}
                disabled
              >
                Prohlédnout katalog akcí
              </Button>
              <OrganizerSignupButton />
            </div>
            <p className="max-w-190 text-sm text-muted-foreground">
              Prohlížet veřejné informace můžete bez přihlášení. Cesta „Prohlédnout katalog akcí“ je
              pro účastníky, „Registrovat organizátora“ je pro pořadatele.
            </p>
          </div>
        </section>

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
              <InfoCard title="Pro účastníky a rodiče">
                Hledáte akci pro sebe nebo tábor pro děti? Projděte si nabídku a přečtěte si
                informace, které potřebujete pro výběr.
              </InfoCard>
            </li>
            <li>
              <InfoCard title="Pro pořadatele">
                Připravujete akci nebo tábor? Představte svůj program a pomozte zájemcům zjistit,
                jak se mohou zúčastnit.
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
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              className={CTA_CLASS}
              disabled
            >
              Prohlédnout katalog akcí
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={CTA_CLASS}
              disabled
            >
              Přístup pro účastníky
            </Button>
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
            <OrganizerSignupButton />
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
            Objevte akci, které se chcete zúčastnit, nebo dejte prostor té vlastní.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              className={CTA_CLASS}
              disabled
            >
              Prohlédnout katalog akcí
            </Button>
            <OrganizerSignupButton />
          </div>
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
            <p className="text-sm text-muted-foreground">
              Pro pořádání a účast na akcích a táborech.
            </p>
          </div>
          {/* Placeholders until PO delivers contact details and legal texts. */}
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

function OrganizerSignupButton() {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={CTA_CLASS}
    >
      <Link to={ROUTES.signup}>Registrovat organizátora</Link>
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
