import { createFileRoute, Link } from "@tanstack/react-router"
import { CalendarDays } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PublicShell } from "@/components/PublicShell"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

// Veřejný katalog akcí. Placeholder so the event detail (F55) has its way
// back; the list itself is delivered by F54-2a (#170), which replaces this page.
export const Route = createFileRoute("/events/")({ component: CatalogPage })

function CatalogPage() {
  return (
    <PublicShell>
      <Seo title="Katalog akcí" />
      <h1 className="mb-8 text-h2">Katalog akcí</h1>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays />
          </EmptyMedia>
          <EmptyTitle>Katalog akcí připravujeme</EmptyTitle>
          <EmptyDescription>Veřejný seznam akcí bude brzy k dispozici.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.home}>Zpět na úvodní stránku</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </PublicShell>
  )
}
