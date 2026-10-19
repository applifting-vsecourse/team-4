import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarCog,
  Menu,
  Users,
  WalletCards,
} from "lucide-react"

import { ROUTES } from "@/app/routes"
import logoUrl from "@/assets/akcio-logo.png"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { AppPreview } from "./AppPreview"
import { EntryCard } from "./EntryCard"
import { LandingSection } from "./LandingSection"

// Sections follow the wireframe (Figma 72:7549 / 72:7208); hero copy is the text
// approved in S2-01. Only what Sprint 2 delivers: no public catalog, adult
// participants only, rooms and beds without assigning people to rooms.

const FEATURES = [
  {
    icon: CalendarCog,
    title: "Přihlášky po termínech",
    text: "Výběr více termínů, každý se potvrzuje zvlášť.",
  },
  {
    icon: BedDouble,
    title: "Ubytování a kapacita",
    text: "Kapacita vychází z pokojů a lůžek.",
  },
  {
    icon: WalletCards,
    title: "Platby a splatnost",
    text: "Splatnost u každé přihlášky, ruční zápis plateb.",
  },
]

// Placeholders until PO delivers contact details and legal texts.
const FOOTER_PLACEHOLDERS = ["Kontakt", "Ochrana osobních údajů", "Podmínky použití"]

// Header and footer run wider (1 280 px) than the sections (1 120 px), as in the wireframe.
const FRAME_CLASS = "mx-auto flex w-full max-w-320 px-4 md:px-8"

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
        <div className={cn(FRAME_CLASS, "items-center justify-between gap-3 py-3 md:py-5")}>
          <Link
            to={ROUTES.home}
            className="rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <BrandMark isLarge />
          </Link>
          <nav
            aria-label="Vstup do aplikace"
            className="hidden items-center gap-2 md:flex"
          >
            <MyRegistrationsButton
              variant="ghost"
              size="sm"
            />
            <OrganizerButton size="sm" />
            <ThemeSwitcher />
          </nav>
          <MobileMenu />
        </div>
      </header>

      <main
        id="obsah"
        tabIndex={-1}
        className="outline-none"
      >
        <section
          aria-labelledby="uvod-nadpis"
          className="pt-12 pb-12 md:pt-28 md:pb-24"
        >
          <div className="mx-auto flex w-full max-w-280 flex-col gap-5 px-4 md:items-center md:gap-6 md:px-8 md:text-center">
            <Badge variant="outline">Pro tábory, soustředění a další pobytové akce</Badge>
            <div className="flex flex-col gap-4 md:max-w-220 md:items-center">
              <h1
                id="uvod-nadpis"
                className="text-h1 lg:text-6xl"
              >
                Přihlášky, ubytování a platby pro vaše akce na jednom místě
              </h1>
              <p className="text-sm text-muted-foreground md:max-w-170">
                Pořadatelé spravují termíny, kapacitu a přijaté platby. Účastníci se přihlásí online
                a mají přehled o své účasti a úhradě.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <OrganizerButton
                hasArrow
                className="w-full sm:w-auto"
              />
              <MyRegistrationsButton
                variant="outline"
                className="w-full sm:w-auto"
              />
            </div>
            <AppPreview />
          </div>
        </section>

        <LandingSection
          labelledBy="kudy-dal-nadpis"
          isMuted
        >
          <h2
            id="kudy-dal-nadpis"
            className="text-h2"
          >
            Kudy dál
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
            <li>
              <EntryCard
                icon={Users}
                audience="Pro účastníky"
                title="Moje přihlášky"
                actions={
                  <MyRegistrationsButton
                    variant="outline"
                    size="sm"
                    hasArrow
                  />
                }
              >
                Zadejte e-mail, se kterým jste se přihlásili na akci. Pošleme vám odkaz pro vstup
                bez hesla a uvidíte stav své účasti i platby.
              </EntryCard>
            </li>
            <li>
              <EntryCard
                icon={Building2}
                audience="Pro pořadatele"
                title="Organizátor"
                actions={
                  <>
                    <OrganizerButton
                      size="sm"
                      hasArrow
                    />
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                    >
                      <Link to={ROUTES.signup}>Registrovat organizátora</Link>
                    </Button>
                  </>
                }
              >
                Přihlaste se e-mailem a heslem, nebo si založte účet a první organizaci. Akce,
                termíny, ubytování a platby spravujete na jednom místě.
              </EntryCard>
            </li>
          </ul>
        </LandingSection>

        <LandingSection labelledBy="funkce-nadpis">
          <h2
            id="funkce-nadpis"
            className="text-h2"
          >
            Co akc.io umí
          </h2>
          <ul className="grid gap-7 md:grid-cols-3 md:gap-10">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex flex-col gap-2.5"
              >
                <Icon
                  aria-hidden
                  className="size-6"
                />
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </LandingSection>
      </main>

      <footer className="border-t border-border">
        <div
          className={cn(
            FRAME_CLASS,
            "flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between md:py-10",
          )}
        >
          <div className="flex flex-col gap-1.5">
            <BrandMark />
            <p className="text-xs text-muted-foreground">© 2026 akc.io</p>
          </div>
          <ul className="flex flex-col gap-2 text-sm font-medium md:flex-row md:gap-6">
            {FOOTER_PLACEHOLDERS.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  )
}

// Below md the header entries collapse into one menu button (PR #117 review).
function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Otevřít menu"
          className="md:hidden"
        >
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        lang="cs"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav
          aria-label="Vstup do aplikace"
          className="flex flex-col gap-2 px-4"
        >
          <OrganizerButton />
          <MyRegistrationsButton />
        </nav>
        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">Motiv</span>
          <ThemeSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Decorative: the "akc.io" text next to it is the accessible name.
function BrandMark({ isLarge = false }: { isLarge?: boolean }) {
  return (
    <span
      className={cn("flex items-center font-medium", isLarge ? "gap-2.5 text-xl" : "gap-2 text-sm")}
    >
      <img
        src={logoUrl}
        alt=""
        width={isLarge ? 36 : 24}
        height={isLarge ? 36 : 24}
        className={isLarge ? "size-9" : "size-6"}
      />
      akc.io
    </span>
  )
}

type EntryButtonProps = {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm"
  hasArrow?: boolean
  className?: string
}

function OrganizerButton({
  variant = "default",
  size = "default",
  hasArrow = false,
  className,
}: EntryButtonProps) {
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className}
    >
      {/* Login offers organizer signup too. */}
      <Link to={ROUTES.login}>
        Organizátor
        {hasArrow ? <ArrowRight aria-hidden /> : null}
      </Link>
    </Button>
  )
}

// Participant magic-link access is S2-13; link it here once that route exists.
function MyRegistrationsButton({
  variant = "outline",
  size = "default",
  hasArrow = false,
  className,
}: EntryButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled
    >
      Moje přihlášky
      {hasArrow ? <ArrowRight aria-hidden /> : null}
    </Button>
  )
}
