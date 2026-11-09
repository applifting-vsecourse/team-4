import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronDown } from "lucide-react"
import { expect } from "storybook/test"

import { BrandMark } from "@/components/BrandMark"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { WorkspacePage } from "@/components/WorkspacePage"
import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { DRAFT_EVENT } from "@/features/events/fixtures/events"

function SettingsGroup({
  title,
  isInitiallyOpen,
  children,
}: {
  title: string
  isInitiallyOpen?: boolean
  children: ReactNode
}) {
  return (
    <Collapsible defaultOpen={isInitiallyOpen}>
      <h2 className="text-h4">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="group w-full justify-between"
          >
            {title}
            <ChevronDown
              aria-hidden
              className="group-data-[state=open]:rotate-180"
            />
          </Button>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent>
        <div className="mt-4">
          <Card>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function Preview() {
  const event = DRAFT_EVENT
  return (
    <WorkspacePage>
      <header className="mb-4">
        <BrandMark isLarge />
      </header>
      <PageHeader title="Nastavení" />
      <div className="space-y-4">
        <SettingsGroup
          title="Základní údaje"
          isInitiallyOpen
        >
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Název</dt>
              <dd>{event.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Místo</dt>
              <dd>{event.location}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Popis</dt>
              <dd>{event.description}</dd>
            </div>
          </dl>
        </SettingsGroup>
        <SettingsGroup title="Termíny a ceny">
          <ul className="space-y-2 text-sm">
            {event.terms.map((term) => (
              <li key={term.id}>
                <strong>{term.label}</strong> · {formatCalendarRange(term.startDate, term.endDate)}{" "}
                · {formatCzk(term.priceMinor)}
              </li>
            ))}
          </ul>
        </SettingsGroup>
        <SettingsGroup title="Platební nastavení">
          <p className="text-sm">Platební údaje chybí.</p>
        </SettingsGroup>
      </div>
    </WorkspacePage>
  )
}

const meta = {
  title: "Designs/288 Collapsible event settings",
  component: Preview,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
} satisfies Meta<typeof Preview>

export default meta

export const IndependentSections: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent }) => {
    const details = canvas.getByRole("button", { name: "Základní údaje" })
    const terms = canvas.getByRole("button", { name: "Termíny a ceny" })

    await expect(details).toHaveAttribute("aria-expanded", "true")
    await expect(terms).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(terms)
    await expect(canvas.getByText("Víkend", { exact: true })).toBeVisible()
    await expect(details).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{Enter}")
    await expect(terms).toHaveAttribute("aria-expanded", "false")
  },
}
