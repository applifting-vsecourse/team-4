import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  BedDouble,
  CalendarCog,
  ClipboardList,
  ListChecks,
  UserRoundPlus,
  WalletCards,
} from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import organizersImage from "@/features/landing/images/core-toolkit.webp"

import { AudiencePage, type AudienceBenefit } from "./AudiencePage"

const BENEFITS: AudienceBenefit[] = [
  {
    icon: ClipboardList,
    title: "Přihlášky",
    text: "Všechny přihlášky na jednom místě, s údaji, které jste od účastníků chtěli.",
  },
  {
    icon: CalendarCog,
    title: "Termíny a kapacita",
    text: "Akce může mít více termínů. U každého vidíte, kolik míst zbývá.",
  },
  {
    icon: BedDouble,
    title: "Ubytování",
    text: "Nastavíte pokoje a lůžka a sledujete jejich obsazenost.",
  },
  {
    icon: ListChecks,
    title: "Vyhodnocení",
    text: "Aplikace navrhne, koho přijmout. Účast potvrdíte až po vlastní kontrole.",
  },
  {
    icon: UserRoundPlus,
    title: "Náhradníci",
    text: "Kdo se nevešel, čeká jako náhradník a uvolněné místo může dostat on.",
  },
  {
    icon: WalletCards,
    title: "Přijaté platby",
    text: "Přehled, kdo už zaplatil a kolik zbývá vybrat.",
  },
]

const SAMPLE_REGISTRATIONS = [
  { name: "Jana Ukázková", status: "confirmed", payment: "4 500 Kč" },
  { name: "Petr Vzorový", status: "proposed", payment: null },
  { name: "Eva Příkladná", status: "waitlisted", payment: null },
] as const

const STATUS_BADGE = {
  confirmed: <Badge variant="success">Potvrzeno</Badge>,
  proposed: <Badge variant="outline">Návrh: přijmout</Badge>,
  waitlisted: <Badge variant="warning">Náhradník</Badge>,
}

function OrganizerDemo() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>1. termín · 12.–19. 7. 2027</CardDescription>
        <CardTitle>Letní tábor Modrá Hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-semibold tabular-nums">42 / 48</span>
              <span className="text-sm text-muted-foreground">obsazeno</span>
            </div>
            <Progress
              value={88}
              aria-label="Obsazenost 42 ze 48 míst"
            />
          </div>
          <Table containerLabel="Ukázka přihlášek účastníků">
            <TableHeader>
              <TableRow>
                <TableHead>Účastník</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Přijatá platba</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_REGISTRATIONS.map(({ name, status, payment }) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell>{STATUS_BADGE[status]}</TableCell>
                  <TableCell>
                    {payment ? (
                      <span className="flex items-center gap-2">
                        {payment}
                        <Badge variant="secondary">Simulace</Badge>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Zatím nic</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export function ForOrganizersPage() {
  return (
    <AudiencePage
      title="Pro organizátory"
      lead="Přihlášky, termíny, ubytování i platby vaší akce v jedné aplikaci místo tabulek a e-mailů."
      imageSrc={organizersImage}
      imageAlt="Ilustrace správy přihlášek, ubytování a plateb"
      actions={
        <>
          <Button
            asChild
            size="lg"
          >
            <Link to={ROUTES.signup}>
              Založit účet
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
          >
            <Link to={ROUTES.login}>Přihlásit se</Link>
          </Button>
        </>
      }
      benefits={BENEFITS}
      demo={<OrganizerDemo />}
      otherAudience={{ to: ROUTES.forParticipants, label: "Pro účastníky" }}
    />
  )
}
