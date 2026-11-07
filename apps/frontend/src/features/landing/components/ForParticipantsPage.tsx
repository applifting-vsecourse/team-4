import { Link } from "@tanstack/react-router"
import { ArrowRight, BadgeCheck, CalendarDays, FilePen, Send, WalletCards } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import participantsImage from "@/features/landing/images/event-types.webp"

import { AudiencePage, type AudienceBenefit } from "./AudiencePage"

const BENEFITS: AudienceBenefit[] = [
  {
    icon: Send,
    title: "Podání přihlášky",
    text: "Akci najdete v katalogu, vyberete termín a vyplníte přihlášku. Účet nepotřebujete.",
  },
  {
    icon: BadgeCheck,
    title: "Stav účasti",
    text: "Vidíte, jestli je vaše účast potvrzená, nebo čekáte jako náhradník.",
  },
  {
    icon: FilePen,
    title: "Změny vlastních údajů",
    text: "Své údaje v přihlášce upravíte sami, bez psaní organizátorovi.",
  },
  {
    icon: WalletCards,
    title: "Přehled úhrad",
    text: "Kolik máte zaplatit, kolik už je uhrazeno a co zbývá.",
  },
  {
    icon: CalendarDays,
    title: "Program termínu",
    text: "Po potvrzení účasti uvidíte program svého termínu.",
  },
]

const SAMPLE_PROGRAMME = [
  { time: "Po 12. 7. 14:00", title: "Příjezd a ubytování" },
  { time: "Po 12. 7. 18:00", title: "Večeře a seznámení" },
  { time: "Út 13. 7. 9:00", title: "Výlet na Modrou Horu" },
]

function ParticipantDemo() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Moje přihláška · 1. termín · 12.–19. 7. 2027</CardDescription>
        <CardTitle>Letní tábor Modrá Hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Jana Ukázková</span>
            <Badge variant="success">Účast potvrzena</Badge>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Uhrazeno 4 500 Kč z 4 500 Kč</span>
            <Badge variant="secondary">Simulovaná platba</Badge>
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Program (časy Europe/Prague)</h3>
            <ul className="flex flex-col gap-1">
              {SAMPLE_PROGRAMME.map(({ time, title }) => (
                <li
                  key={time}
                  className="flex gap-4"
                >
                  <span className="w-32 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                    {time}
                  </span>
                  <span>{title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ForParticipantsPage() {
  return (
    <AudiencePage
      title="Pro účastníky"
      lead="Najdete akci, přihlásíte se a pak na jednom místě vidíte, na čem jste."
      imageSrc={participantsImage}
      imageAlt="Ilustrace různých typů akcí: tábor, sportovní soustředění, workshop a výjezd"
      actions={
        <>
          <Button
            asChild
            size="lg"
          >
            <Link to={ROUTES.catalog}>
              Hledat v katalogu
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
          >
            <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
          </Button>
        </>
      }
      benefits={BENEFITS}
      demo={<ParticipantDemo />}
      otherAudience={{ to: ROUTES.forOrganizers, label: "Pro organizátory" }}
    />
  )
}
