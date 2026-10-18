import { CalendarX, CircleAlert, Info } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ShowcaseItem, ShowcaseSection } from "./ShowcaseSection"

const APPLICATIONS = [
  {
    id: "2027000141",
    name: "Jana Nováková",
    term: "1. turnus",
    status: <Badge variant="success">Potvrzeno</Badge>,
    payment: <Badge variant="success">Zaplaceno</Badge>,
    amount: "4 500 Kč",
  },
  {
    id: "2027000142",
    name: "Maximilián Svatopluk Dvořáček-Hromádková",
    term: "1. a 2. turnus",
    status: <Badge variant="warning">Náhradník</Badge>,
    payment: <Badge variant="warning">Částečně</Badge>,
    amount: "2 000 Kč",
  },
  {
    id: "2027000143",
    name: "Petr Svoboda",
    term: "2. turnus",
    status: <Badge variant="success">Potvrzeno</Badge>,
    payment: <Badge variant="destructive-subtle">Po splatnosti</Badge>,
    amount: "0 Kč",
  },
]

export function DataDisplaySection() {
  return (
    <>
      <ShowcaseSection
        id="badges"
        title="Štítky stavu"
        description="success = potvrzeno / zaplaceno, warning = náhradník / částečně, destructive-subtle = po splatnosti / chyba."
      >
        <div className="flex flex-wrap gap-2">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="destructive">destructive</Badge>
          <Badge variant="success">Potvrzeno</Badge>
          <Badge variant="warning">Náhradník</Badge>
          <Badge variant="destructive-subtle">Po splatnosti</Badge>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="alerts"
        title="Hlášení"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Alert>
            <Info />
            <AlertTitle>Platební údaje odeslány</AlertTitle>
            <AlertDescription>
              Splatnost je 14 dní od potvrzení, tj. do 26. 10. 2026 23:59 (Europe/Prague).
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Přihlášku se nepodařilo uložit</AlertTitle>
            <AlertDescription>Zkontrolujte připojení a zkuste to znovu.</AlertDescription>
          </Alert>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="table"
        title="Tabulka"
        description="Na úzké obrazovce se tabulka posouvá uvnitř svého kontejneru, ne celá stránka."
      >
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableCaption className="sr-only">Přihlášky na Letní tábor 2027</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>VS</TableHead>
                <TableHead>Účastník</TableHead>
                <TableHead>Turnus</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Platba</TableHead>
                <TableHead className="text-right">Zaplaceno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {APPLICATIONS.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-mono">{application.id}</TableCell>
                  <TableCell className="max-w-56 truncate font-medium">
                    {application.name}
                  </TableCell>
                  <TableCell>{application.term}</TableCell>
                  <TableCell>{application.status}</TableCell>
                  <TableCell>{application.payment}</TableCell>
                  <TableCell className="text-right font-mono">{application.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="states"
        title="Načítání a prázdný stav"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <ShowcaseItem label="Skeleton">
            <div
              className="space-y-3 rounded-lg border border-border bg-card p-4"
              aria-busy="true"
              aria-label="Načítání"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </ShowcaseItem>
          <ShowcaseItem label="Empty">
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarX />
                </EmptyMedia>
                <EmptyTitle>Zatím žádné akce</EmptyTitle>
                <EmptyDescription>Vytvořte první akci a otevřete přihlášky.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button>Vytvořit akci</Button>
              </EmptyContent>
            </Empty>
          </ShowcaseItem>
          <ShowcaseItem label="Progress">
            <OccupancyProgress />
          </ShowcaseItem>
          <ShowcaseItem label="Avatar">
            <div className="flex gap-2">
              <Avatar>
                <AvatarFallback>JN</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>PS</AvatarFallback>
              </Avatar>
            </div>
          </ShowcaseItem>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="card"
        title="Karta"
      >
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Letní tábor 2027</CardTitle>
            <CardDescription>5.–19. 7. 2027 · Chata Javor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Obsazeno 32 z 40 lůžek, 3 náhradníci.</p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button>Přihlášky</Button>
            <Button variant="outline">Upravit</Button>
          </CardFooter>
        </Card>
      </ShowcaseSection>
    </>
  )
}

function OccupancyProgress() {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span id="ds-progress-label">Obsazenost</span>
        <span className="font-mono">32 / 40</span>
      </div>
      <Progress
        value={80}
        aria-labelledby="ds-progress-label"
      />
    </div>
  )
}
