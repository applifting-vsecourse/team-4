import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  BedDouble,
  CalendarCog,
  MailCheck,
  Menu,
  Search,
  WalletCards,
} from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BrandMark } from "@/components/BrandMark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

// POC direction D: a personal home page from the 2000s, drawn with today's care. Flat panels with a
// tinted label strip, a link directory for the catalogue, a "last updated" line in the footer. Symmetric.

const BOARD = [
  {
    name: "Letní tábor Modrá Hora",
    when: "12.–19. 7. 2027",
    place: "Modrá Hora",
    state: "Volná místa",
  },
  { name: "Víkend deskových her", when: "3.–5. 9. 2027", place: "Sázava", state: "Poslední místa" },
  { name: "Jazykové soustředění", when: "21.–28. 8. 2027", place: "Jeseníky", state: "Náhradníci" },
  { name: "Fotografický workshop", when: "10.–12. 6. 2027", place: "Šumava", state: "Volná místa" },
] as const

const STATE_VARIANT = {
  "Volná místa": "success",
  "Poslední místa": "warning",
  Náhradníci: "secondary",
} as const

const ORGANIZER_POINTS = [
  {
    icon: CalendarCog,
    title: "Termíny a kapacita",
    text: "Akce s více termíny. Kapacitu spočítáme z pokojů a lůžek.",
  },
  {
    icon: WalletCards,
    title: "Přihlášky a platby",
    text: "Kdo je potvrzený, kdo čeká a kdo zaplatil, na první pohled.",
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
    title: "Přihláška bez hesla",
    text: "Stačí e-mail. Odkaz pro vstup vám pošleme.",
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

type WindowProps = {
  title: string
  labelledBy: string
  children: ReactNode
}

// A panel: tinted label strip on top, content below. Fills its grid cell so paired panels match.
function Window({ title, labelledBy, children }: WindowProps) {
  return (
    <section
      data-role="window"
      aria-labelledby={labelledBy}
      className="flex h-full flex-col"
    >
      <div data-role="titlebar">
        <h2 id={labelledBy}>{title}</h2>
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">{children}</div>
    </section>
  )
}

function Points({ points }: { points: typeof ORGANIZER_POINTS }) {
  return (
    <ul className="flex flex-col gap-5">
      {points.map(({ icon: Icon, title, text }) => (
        <li
          key={title}
          className="flex gap-3"
        >
          <Icon
            aria-hidden
            className="mt-0.5 size-5 shrink-0"
          />
          <div>
            <h3 className="text-base">{title}</h3>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function LandingWeb() {
  return (
    <div
      lang="cs"
      className="min-h-svh text-foreground"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:py-10">
        <header
          data-role="window"
          className="flex items-center justify-between gap-4 p-4 md:px-6"
        >
          <div className="flex flex-col gap-1">
            <Link
              to={ROUTES.home}
              data-role="brand"
              className="w-fit"
            >
              <BrandMark isLarge />
            </Link>
            <p className="font-serif text-sm text-muted-foreground italic">
              Přihlášky, ubytování a platby pro tábory a soustředění
            </p>
          </div>
          <nav
            aria-label="Vstup do aplikace"
            className="hidden items-center gap-2 md:flex"
          >
            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <a href="#katalog">Katalog akcí</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
            </Button>
            <Button
              asChild
              size="sm"
            >
              <Link to={ROUTES.login}>Organizátor</Link>
            </Button>
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
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
                  <a href="#katalog">Katalog akcí</a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex flex-col gap-6">
          <section
            data-role="window"
            aria-labelledby="vitejte"
          >
            <div data-role="titlebar">
              <p>Vítejte</p>
            </div>
            <div className="flex flex-col items-start gap-5 p-6 md:p-10">
              <span
                data-role="sticker"
                className="-rotate-2 px-2 py-0.5 text-xs"
              >
                NOVĚ: katalog akcí
              </span>
              <h1
                id="vitejte"
                className="text-5xl leading-tight text-balance md:text-6xl"
              >
                Vítejte na akc.io!
              </h1>
              <p className="max-w-xl text-balance">
                Ať akci pořádáte, nebo na ni jedete, jste tu správně. Pořadatelé tu mají přihlášky,
                ubytování a platby pod kontrolou. Účastníci najdou akci a vědí, na čem jsou.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="w-44"
                >
                  <Link to={ROUTES.login}>
                    Pořádám akci
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-44"
                >
                  <a href="#katalog">Hledám akci</a>
                </Button>
              </div>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <Window
              title="Pro pořadatele"
              labelledBy="poradatele"
            >
              <Points points={ORGANIZER_POINTS} />
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
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
                  variant="outline"
                  className="w-44"
                >
                  <Link to={ROUTES.signup}>Založit účet</Link>
                </Button>
              </div>
            </Window>
            <Window
              title="Pro účastníky"
              labelledBy="ucastnici"
            >
              <Points points={PARTICIPANT_POINTS} />
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <Button
                  asChild
                  className="w-44"
                >
                  <a href="#katalog">
                    Procházet katalog
                    <ArrowRight aria-hidden />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-44"
                >
                  <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
                </Button>
              </div>
            </Window>
          </div>

          <div id="katalog">
            <Window
              title="Katalog akcí: nově přidané"
              labelledBy="katalog-nadpis"
            >
              <ul className="flex flex-col">
                {BOARD.map((event) => (
                  <li
                    key={event.name}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-dotted border-border py-3 first:pt-0"
                  >
                    <span>
                      <a href="#katalog">{event.name}</a>
                      <span className="block text-sm text-muted-foreground">
                        {event.when} · {event.place}
                      </span>
                    </span>
                    <Badge variant={STATE_VARIANT[event.state]}>{event.state}</Badge>
                  </li>
                ))}
              </ul>
              <p className="pt-4 text-sm">
                <a href="#katalog">Zobrazit všechny akce »</a>
              </p>
            </Window>
          </div>

          <Window
            title="Co uděláte vy, to vidí oni"
            labelledBy="jak-nadpis"
          >
            <ol className="flex flex-col">
              <li
                aria-hidden
                className="hidden grid-cols-12 gap-4 pb-2 text-sm font-bold md:grid"
              >
                <span className="col-span-5">Pořadatel</span>
                <span className="col-span-5 col-start-8">Účastník</span>
              </li>
              {PAIRS.map(([organizer, participant]) => (
                <li
                  key={organizer}
                  className="grid gap-1 border-t border-dotted border-border py-3 md:grid-cols-12 md:items-center md:gap-4"
                >
                  <p className="md:col-span-5">{organizer}</p>
                  <ArrowRight
                    aria-hidden
                    className="hidden size-5 md:col-span-2 md:block md:justify-self-center"
                  />
                  <p className="text-muted-foreground md:col-span-5">
                    <ArrowRight
                      aria-hidden
                      className="mr-2 inline size-4 md:hidden"
                    />
                    {participant}
                  </p>
                </li>
              ))}
            </ol>
          </Window>
        </main>

        <footer
          data-role="window"
          className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6"
        >
          <div className="flex flex-col gap-1.5">
            <BrandMark />
            <p className="text-xs text-muted-foreground">
              © 2026 akc.io · naposledy aktualizováno 1. 11. 2026
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <li>
              <a href="#katalog">Kontakt</a>
            </li>
            <li>
              <a href="#katalog">Ochrana osobních údajů</a>
            </li>
            <li>
              <a href="#katalog">Podmínky použití</a>
            </li>
          </ul>
        </footer>
      </div>
    </div>
  )
}
