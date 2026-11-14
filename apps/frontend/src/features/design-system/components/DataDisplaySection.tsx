import { useState } from "react"
import { CalendarX, Lock } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { FormError } from "@/components/FormError"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Notice } from "@/components/Notice"
import { PageSection } from "@/components/PageSection"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { RefreshButton } from "@/components/RefreshButton"
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
import { CollapsibleSection } from "@/components/ui/collapsible-section"
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
    payment: <Badge variant="destructive-subtle">Chyba</Badge>,
    amount: "0 Kč",
  },
]

export function DataDisplaySection() {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <>
      <ShowcaseSection
        id="collapsible-section"
        title="Sbalitelná sekce"
        description="Celý nadpis ovládá obsah; otevření i zavření plynule přechází podle výšky obsahu."
      >
        <CollapsibleSection
          headingId="design-system-collapsible-section"
          title="Nastavení účasti"
        >
          <p className="text-sm text-muted-foreground">
            Sdílená sekce zachovává obsah při sbalení a animuje změnu výšky.
          </p>
        </CollapsibleSection>
      </ShowcaseSection>

      <ShowcaseSection
        id="badges"
        title="Štítky stavu"
        description="success = potvrzeno / zaplaceno, warning = náhradník / částečně, destructive-subtle = chyba."
      >
        <div className="flex flex-wrap gap-2">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="destructive">destructive</Badge>
          <Badge variant="success">Potvrzeno</Badge>
          <Badge variant="warning">Náhradník</Badge>
          <Badge variant="destructive-subtle">Chyba</Badge>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="alerts"
        title="Hlášení"
        description="Notice podle tónu, FormError u formuláře, LoadError při neúspěšném načtení."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ShowcaseItem label="Notice info">
            <Notice
              tone="info"
              title="Změna platí jen pro nové přihlášky"
            >
              Přihlášky, které už akce přijala, si ponechávají původní účet.
            </Notice>
          </ShowcaseItem>
          <ShowcaseItem label="Notice success">
            <Notice
              tone="success"
              title="Přihlašování je otevřené"
            />
          </ShowcaseItem>
          <ShowcaseItem label="Notice warning">
            <Notice
              tone="warning"
              title="Bez platebního nastavení nelze otevřít přihlašování"
            />
          </ShowcaseItem>
          <ShowcaseItem label="Notice s vlastní ikonou">
            <Notice
              tone="info"
              icon={Lock}
              title="Od otevření přihlašování jsou název, popis, místo, termíny a ceny zamčené"
            />
          </ShowcaseItem>
          <ShowcaseItem label="FormError">
            <FormError message="Přihlášku se nepodařilo uložit. Zkuste to prosím znovu." />
          </ShowcaseItem>
          <ShowcaseItem label="LoadError inline">
            <LoadError
              shownFrom={Date.UTC(2026, 9, 12, 12, 30)}
              onRetry={() => undefined}
            />
          </ShowcaseItem>
          <ShowcaseItem label="LoadError page">
            <LoadError
              variant="page"
              title="Katalog se nepodařilo načíst"
              onRetry={() => undefined}
            />
          </ShowcaseItem>
          <ShowcaseItem label="RecordUnavailable">
            <RecordUnavailable action={<Button variant="outline">Zpět na přehled akcí</Button>} />
          </ShowcaseItem>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="page-actions"
        title="Akce stránky"
      >
        <div className="flex flex-wrap items-center gap-4">
          <BackLink to={ROUTES.designSystem}>Zpět na přehled</BackLink>
          <RefreshButton
            isRefreshing={false}
            onRefresh={() => undefined}
          />
          <ConfirmDeleteDialog
            isOpen={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            trigger={<Button variant="destructive">Odstranit termín</Button>}
            title="Odstranit termín „Turnus 1“?"
            consequence="Termín se z akce trvale odstraní."
            onConfirm={() => setIsDeleteOpen(false)}
          />
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="page-section"
        title="Sekce stránky"
      >
        <PageSection
          title="Seznam přihlášek"
          actions={
            <RefreshButton
              isRefreshing={false}
              onRefresh={() => undefined}
            />
          }
        >
          <Card>
            <CardContent>
              <p className="text-sm">Obsah sekce</p>
            </CardContent>
          </Card>
        </PageSection>
      </ShowcaseSection>

      <ShowcaseSection
        id="table"
        title="Tabulka"
        description="Na úzké obrazovce se tabulka posouvá uvnitř svého kontejneru, ne celá stránka."
      >
        <Card padding="none">
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
        </Card>
      </ShowcaseSection>

      <ShowcaseSection
        id="states"
        title="Načítání a prázdný stav"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <ShowcaseItem label="Skeleton">
            <LoadingBlock
              label="Načítání"
              className="space-y-3"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </LoadingBlock>
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
