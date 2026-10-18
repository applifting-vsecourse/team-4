import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"

import { ControlsSection } from "./ControlsSection"
import { DataDisplaySection } from "./DataDisplaySection"
import { FoundationsSection } from "./FoundationsSection"
import { OverlaysNavigationSection } from "./OverlaysNavigationSection"

export function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h2 sm:text-h1">akc.io design system</h1>
          <p className="text-sm text-muted-foreground">
            Náhled tokenů a komponent z <code className="font-mono">src/components/ui</code>. Jen
            pro vývoj, v produkčním buildu stránka neexistuje. Pravidla jsou v DESIGN.md.
          </p>
        </div>
        <ThemeSwitcher />
      </div>
      <FoundationsSection />
      <ControlsSection />
      <DataDisplaySection />
      <OverlaysNavigationSection />
    </main>
  )
}
