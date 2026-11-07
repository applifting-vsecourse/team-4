import { type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  BedDouble,
  CalendarCog,
  MailCheck,
  Menu,
  Search,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BrandMark } from "@/components/BrandMark"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { IllustratedSections } from "./IllustratedSections"

// Landing page in the S3-T2 "Ticket stub" direction (A). Two audiences, one page: organizers
// (wider panel, leads) and participants. The audience and closing panels are dark in both themes
// (a `dark` scope), so they match each other and their buttons. Colours come only from semantic tokens.
// Every catalog entry leads to the public catalog (F54-2a); the page shows a preview of it.

const WRAP = "mx-auto w-full max-w-280 px-4 md:px-8"
const LABEL = "font-mono text-xs tracking-widest uppercase"

const ORGANIZER_POINTS = [
  {
    icon: CalendarCog,
    title: "Termíny a kapacita",
    text: "Založíte akci s více termíny. Kapacitu spočítáme z pokojů a lůžek.",
  },
  {
    icon: WalletCards,
    title: "Přihlášky a platby",
    text: "Vidíte, kdo je potvrzený, kdo čeká a kdo už zaplatil.",
  },
  {
    icon: BedDouble,
    title: "Do katalogu jedním klikem",
    text: "Hotovou akci zveřejníte tam, kde ji lidé hledají.",
  },
]

const PARTICIPANT_POINTS = [
  {
    icon: Search,
    title: "Katalog akcí",
    text: "Projděte nabídku táborů a soustředění a vyberte termín.",
  },
  {
    icon: MailCheck,
    title: "Návrat k přihláškám bez hesla",
    text: "Zadejte e-mail, se kterým jste se přihlásili. Odkaz pro vstup vám pošleme.",
  },
  {
    icon: WalletCards,
    title: "Stav přihlášky a platby",
    text: "Potvrzení i platební údaje máte na jednom místě.",
  },
]

const PAIRS = [
  ["Vytvoříte akci a termíny", "Najdou ji v katalogu"],
  ["Nastavíte pokoje a cenu", "Přihlásí se e-mailem"],
  ["Sledujete obsazenost a platby", "Vidí stav své přihlášky"],
]

// Placeholders until PO delivers contact details and legal texts.
const FOOTER_PLACEHOLDERS = ["Kontakt", "Ochrana osobních údajů", "Podmínky použití"]

/**
 * `catalogPreview` fills the catalog section with published events; the route
 * supplies it, because features do not import each other.
 */
export function LandingPage({ catalogPreview }: { catalogPreview: ReactNode }) {
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

      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className={cn(WRAP, "flex items-center justify-between gap-3 py-4")}>
          <Link
            to={ROUTES.home}
            className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <BrandMark isLarge />
          </Link>
          <nav
            aria-label="Vstup do aplikace"
            className="hidden items-center gap-2 md:flex"
          >
            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link to={ROUTES.catalog}>Katalog akcí</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
            </Button>
            <Button
              asChild
              size="sm"
            >
              {/* Login offers organizer signup too. */}
              <Link to={ROUTES.login}>Organizátor</Link>
            </Button>
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
        {/* Hero: dominant headline left, tilted event ticket right. */}
        <section
          aria-labelledby="uvod-nadpis"
          // The tilted ticket's backdrop reaches past a 360 px viewport; clip it, not the page.
          className="overflow-x-clip pt-12 pb-12 md:pt-24 md:pb-16"
        >
          <div className={cn(WRAP, "grid items-center gap-14 md:grid-cols-12")}>
            <div className="flex flex-col gap-8 md:col-span-7">
              <p className={cn(LABEL, "text-muted-foreground")}>
                Přihlášky · ubytování · platby · katalog
              </p>
              <h1
                id="uvod-nadpis"
                className="text-6xl leading-tight font-semibold tracking-tighter text-balance md:text-7xl lg:text-8xl"
              >
                Akce bez{" "}
                <mark className="mt-3 inline-block bg-primary px-3 text-primary-foreground">
                  chaosu
                </mark>
              </h1>
              <p className="max-w-xl text-lg text-balance">
                Pořadatelé mají celou akci pod kontrolou. Účastníci najdou akci, přihlásí se a vědí,
                na čem jsou.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                >
                  <Link to={ROUTES.login}>
                    Chci pořádat akci
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                >
                  <Link to={ROUTES.catalog}>Hledám akci</Link>
                </Button>
              </div>
            </div>

            <div className="relative isolate md:col-span-5">
              <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 rotate-3 rounded-xl bg-primary" />
              <div className="-rotate-2">
                <Card>
                  <CardHeader>
                    <CardDescription>12.–19. 7. 2027 · Modrá Hora</CardDescription>
                    <CardTitle>Letní tábor Modrá Hora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono text-3xl font-semibold tabular-nums">
                            148 / 180
                          </span>
                          <span className="text-sm text-muted-foreground">obsazeno</span>
                        </div>
                        <Progress
                          value={82}
                          aria-label="Obsazenost 148 z 180 míst"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="success">Potvrzeno 139</Badge>
                        <Badge variant="warning">Náhradníci 9</Badge>
                        <Badge variant="secondary">Zaplaceno 87 %</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <IllustratedSections />

        {/* Two audiences: staggered, deliberately unequal. */}
        <section
          aria-labelledby="dve-strany"
          className="pt-16 pb-16 md:pt-28 md:pb-28"
        >
          <div className={WRAP}>
            <h2
              id="dve-strany"
              className="mb-10 max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl"
            >
              Jedna akce, dvě strany. Každá dostane, co potřebuje.
            </h2>
            <div className="grid items-start gap-6 md:grid-cols-12">
              <article
                aria-labelledby="pro-poradatele"
                className="dark flex flex-col gap-7 rounded-xl border-2 border-border bg-card p-6 text-card-foreground md:col-span-7 md:p-8"
              >
                <p className={LABEL}>Pro pořadatele</p>
                <h3
                  id="pro-poradatele"
                  className="text-3xl font-semibold tracking-tight text-balance md:text-4xl"
                >
                  Celá akce v jedné aplikaci, bez tabulek a e-mailových řetězců.
                </h3>
                <AudiencePoints points={ORGANIZER_POINTS} />
                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="w-44"
                  >
                    <Link to={ROUTES.login}>
                      Přihlásit se
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    className="w-44"
                  >
                    <Link to={ROUTES.signup}>Založit účet</Link>
                  </Button>
                </div>
              </article>

              <article
                aria-labelledby="pro-ucastniky"
                className="dark flex flex-col gap-7 rounded-xl border-2 border-border bg-card p-6 text-card-foreground md:col-span-5 md:p-8"
              >
                <p className={cn(LABEL, "text-muted-foreground")}>Pro účastníky</p>
                <h3
                  id="pro-ucastniky"
                  className="text-2xl font-semibold tracking-tight text-balance md:text-3xl"
                >
                  Najdete akci, přihlásíte se a víte, na čem jste.
                </h3>
                <AudiencePoints
                  points={PARTICIPANT_POINTS}
                  isMuted
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="w-44"
                  >
                    <Link to={ROUTES.catalog}>
                      Procházet katalog
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-44"
                  >
                    <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
                  </Button>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Catalog preview: the soonest published events and the way into the whole catalog. */}
        <section
          aria-labelledby="katalog-nadpis"
          className="bg-muted py-16 md:py-28"
        >
          <div className={WRAP}>
            <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="flex flex-col gap-3">
                <p className={LABEL}>Katalog akcí</p>
                <h2
                  id="katalog-nadpis"
                  className="max-w-xl text-4xl font-semibold tracking-tight text-balance md:text-5xl"
                >
                  Kam se letos vydat?
                </h2>
              </div>
              <div className="flex max-w-sm flex-col items-start gap-4">
                <p>Akce, které pořadatelé zveřejnili. Vyberte termín a přihlaste se.</p>
                <Button
                  asChild
                  size="lg"
                >
                  <Link to={ROUTES.catalog}>
                    Celý katalog
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
            {catalogPreview}
          </div>
        </section>

        {/* Mirrored flow: what the organizer does on the left, what the participant sees on the right. */}
        <section
          aria-labelledby="jak-nadpis"
          className="py-16 md:py-28"
        >
          <div className={WRAP}>
            <h2
              id="jak-nadpis"
              className="mb-12 max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl"
            >
              Co uděláte vy, to vidí oni.
            </h2>
            <div className="mb-4 hidden grid-cols-12 gap-8 md:grid">
              <p className={cn(LABEL, "col-span-5 text-right")}>Pořadatel</p>
              <p className={cn(LABEL, "col-span-5 col-start-8")}>Účastník</p>
            </div>
            <ol className="flex flex-col">
              {PAIRS.map(([organizer, participant]) => (
                <li
                  key={organizer}
                  className="grid gap-2 border-t border-border py-6 md:grid-cols-12 md:items-center md:gap-8"
                >
                  <p className="text-xl font-semibold md:col-span-5 md:text-right md:text-2xl">
                    {organizer}
                  </p>
                  <ArrowRight
                    aria-hidden
                    className="size-8 md:col-span-2 md:justify-self-center"
                  />
                  <p className="text-xl text-muted-foreground md:col-span-5 md:text-2xl">
                    {participant}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="cta-nadpis"
          className="pb-12 md:pb-20"
        >
          <div className={WRAP}>
            <div className="dark flex flex-col items-center gap-6 rounded-xl border-2 border-border bg-card px-6 py-10 text-center text-card-foreground md:px-12 md:py-14">
              <h2
                id="cta-nadpis"
                className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl"
              >
                Připraveni na akci bez chaosu?
              </h2>
              <p className="max-w-2xl text-lg text-balance">
                Věnujte méně času tabulkám a více tomu, na čem opravdu záleží.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                >
                  <Link to={ROUTES.login}>
                    Chci pořádat akci
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                >
                  <Link to={ROUTES.catalog}>Hledám akci</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div
          className={cn(
            WRAP,
            "flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between",
          )}
        >
          <div className="flex flex-col gap-1.5">
            <BrandMark />
            <p className="text-xs text-muted-foreground">© 2026 akc.io</p>
          </div>
          <ul className="flex flex-col gap-2 text-sm md:flex-row md:gap-6">
            {FOOTER_PLACEHOLDERS.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  )
}

type AudiencePoint = { icon: LucideIcon; title: string; text: string }

function AudiencePoints({
  points,
  isMuted = false,
}: {
  points: AudiencePoint[]
  isMuted?: boolean
}) {
  return (
    <ul className="flex flex-col gap-6">
      {points.map(({ icon: Icon, title, text }) => (
        <li
          key={title}
          className="flex gap-4"
        >
          <Icon
            aria-hidden
            className="mt-1 size-6 shrink-0"
          />
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className={cn(isMuted && "text-muted-foreground")}>{text}</p>
          </div>
        </li>
      ))}
    </ul>
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
          <Button asChild>
            <Link to={ROUTES.login}>Organizátor</Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.catalog}>Katalog akcí</Link>
          </Button>
        </nav>
        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">Motiv</span>
          <ThemeSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  )
}
