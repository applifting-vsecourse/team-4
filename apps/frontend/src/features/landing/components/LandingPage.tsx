import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import logoUrl from "@/assets/akcio-logo.png"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { InfoCard } from "./InfoCard"
import { LandingSection } from "./LandingSection"

// Only what Sprint 2 delivers; deferred features (catalog, bank import,
// room assignment, ...) must not be presented as available.
const FEATURES = [
  {
    title: "Přihlášky",
    text: "Účastníci se přihlásí online na vybrané termíny. Přihlášky se potvrzují podle volné kapacity.",
  },
  {
    title: "Ubytování",
    text: "Evidence pokojů a lůžek, ze které vychází kapacita jednotlivých termínů.",
  },
  {
    title: "Platby",
    text: "Platební instrukce k přihlášce a evidence přijatých plateb. Pořadatel i účastník vidí stejný stav úhrady.",
  },
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
          <nav
            aria-label="Vstup do aplikace"
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className={CTA_CLASS}
            >
              {/* Login offers organizer signup too. */}
              <Link to={ROUTES.login}>Organizátor</Link>
            </Button>
            {/* Participant magic-link access is S2-13; link it here once that route exists. */}
            <Button
              variant="outline"
              size="lg"
              className={CTA_CLASS}
              disabled
            >
              Moje přihlášky
            </Button>
          </nav>
          <ul className="flex max-w-190 flex-col gap-1 text-sm text-muted-foreground">
            <li>Organizátor: přihlášení e-mailem a heslem, nebo registrace nového organizátora.</li>
            <li>Moje přihlášky: pro účastníky, přístup odkazem zaslaným na e-mail, bez hesla.</li>
          </ul>
        </LandingSection>

        <LandingSection
          labelledBy="funkce-nadpis"
          isMuted
        >
          <h2
            id="funkce-nadpis"
            className="text-h2"
          >
            Co akc.io pokrývá
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <InfoCard title={feature.title}>{feature.text}</InfoCard>
              </li>
            ))}
          </ul>
        </LandingSection>
      </main>

      <Separator />

      <footer className="py-10">
        <div className="mx-auto flex w-full max-w-280 flex-col gap-2 px-4 md:px-8">
          <p className="flex items-center gap-2 text-h3">
            <BrandMark />
            akc.io
          </p>
          <p className="text-sm text-muted-foreground">Přihlášky, ubytování a platby pro akce.</p>
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
