import { Link } from "@tanstack/react-router"
import { Lightbulb } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PageSection } from "@/components/PageSection"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { type EventDetail } from "@/features/events/api/eventSchemas"

type EventTipsProps = {
  organizationId: string
  event: EventDetail
  evaluationMode?: "automatic" | "manual"
}

type EventTip = {
  title: string
  description: string
  action: string
  hash: string
}

const missingPresentation = (event: EventDetail) => {
  const missing = []
  if (event.photos.length === 0) missing.push("fotka")
  if (!event.contact) missing.push("veřejný kontakt")
  if (!event.conditions.trim()) missing.push("podmínky účasti")
  return missing
}

const formatList = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} a ${items.at(-1)}` : items[0]

export function EventTips({ organizationId, event, evaluationMode }: EventTipsProps) {
  const missing = missingPresentation(event)
  const tips: EventTip[] = []

  if (event.status === "open" && !event.isPublished) {
    tips.push({
      title: "Zviditelněte akci v katalogu",
      description: "Zájemci ji díky tomu najdou a budou se moct přihlásit.",
      action: "Nastavit katalog",
      hash: "publication-heading",
    })
  }

  if (missing.length > 0) {
    tips.push({
      title: "Doplňte veřejnou prezentaci",
      description: `Na stránce akce zatím chybí: ${formatList(missing)}. Doplňte informace, které zájemcům pomohou s rozhodnutím.`,
      action: "Upravit prezentaci",
      hash: "public-presentation-heading",
    })
  }

  if (evaluationMode === "manual") {
    tips.push({
      title: "Zapněte automatické přepočítání návrhu",
      description:
        "Návrh ubytování se pak aktualizuje po změně vstupů. O potvrzení účasti rozhodujete dál vy.",
      action: "Upravit automatizaci",
      hash: "automation-heading",
    })
  }

  if (tips.length === 0) return null

  return (
    <PageSection title="Tipy pro akci">
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tips.map((tip) => (
          <li key={tip.hash}>
            <Card className="h-full">
              <CardContent className="h-full">
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <Lightbulb
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    />
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold">{tip.title}</h3>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="mt-auto self-start"
                  >
                    <Link
                      to={ROUTES.eventSettings}
                      params={{ organizationId, eventId: event.id }}
                      hash={tip.hash}
                    >
                      {tip.action}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </PageSection>
  )
}
