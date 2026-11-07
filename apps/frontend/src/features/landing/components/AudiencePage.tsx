import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PublicShell } from "@/components/PublicShell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type AudienceBenefit = { icon: LucideIcon; title: string; text: string }

type AudiencePageProps = {
  title: string
  lead: string
  imageSrc: string
  imageAlt: string
  actions: ReactNode
  benefits: AudienceBenefit[]
  /** Static sample of the app with made-up data, never real personal data. */
  demo: ReactNode
  otherAudience: { to: typeof ROUTES.forOrganizers | typeof ROUTES.forParticipants; label: string }
}

/** Public presentation page for one audience (F58/F59), static so it never waits for the API. */
export function AudiencePage({
  title,
  lead,
  imageSrc,
  imageAlt,
  actions,
  benefits,
  demo,
  otherAudience,
}: AudiencePageProps) {
  return (
    <PublicShell>
      <div
        lang="cs"
        className="flex flex-col gap-14"
      >
        <section className="grid items-center gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="text-h1 text-balance">{title}</h1>
            <p className="text-lg text-balance text-muted-foreground">{lead}</p>
            <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>
          </div>
          <img
            src={imageSrc}
            alt={imageAlt}
            decoding="async"
            className="h-auto max-h-80 w-full object-contain"
          />
        </section>

        <section
          aria-labelledby="prinosy"
          className="flex flex-col gap-6"
        >
          <h2
            id="prinosy"
            className="text-h2"
          >
            Co v akc.io zvládnete
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {benefits.map(({ icon: Icon, title: benefitTitle, text }) => (
              <li
                key={benefitTitle}
                className="flex gap-4"
              >
                <Icon
                  aria-hidden
                  className="mt-1 size-6 shrink-0"
                />
                <div>
                  <h3 className="font-semibold">{benefitTitle}</h3>
                  <p className="text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="ukazka"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="ukazka"
              className="text-h2"
            >
              Ukázka aplikace
            </h2>
            <Badge variant="outline">Smyšlená data</Badge>
          </div>
          {demo}
        </section>

        <nav
          aria-label="Další stránky"
          className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6"
        >
          <Button
            asChild
            variant="link"
          >
            <Link to={ROUTES.home}>Úvod</Link>
          </Button>
          <Button
            asChild
            variant="link"
          >
            <Link to={otherAudience.to}>{otherAudience.label}</Link>
          </Button>
        </nav>
      </div>
    </PublicShell>
  )
}
