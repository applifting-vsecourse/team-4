import { ShowcaseSection } from "./ShowcaseSection"

// Each swatch names the Tailwind class it backs, so the page doubles as a token lookup.
const COLOR_TOKENS = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card" },
  { name: "popover", className: "bg-popover" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "muted-foreground", className: "bg-muted-foreground" },
  { name: "accent", className: "bg-accent" },
  { name: "border", className: "bg-border" },
  { name: "input", className: "bg-input" },
  { name: "ring", className: "bg-ring" },
  { name: "destructive", className: "bg-destructive" },
  { name: "destructive-subtle", className: "bg-destructive-subtle" },
  { name: "success", className: "bg-success" },
  { name: "success-subtle", className: "bg-success-subtle" },
  { name: "warning", className: "bg-warning" },
  { name: "warning-subtle", className: "bg-warning-subtle" },
  { name: "sidebar", className: "bg-sidebar" },
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
  { name: "chart-4", className: "bg-chart-4" },
  { name: "chart-5", className: "bg-chart-5" },
] as const

const TYPE_STYLES = [
  { name: "text-h1", className: "text-h1" },
  { name: "text-h2", className: "text-h2" },
  { name: "text-h3", className: "text-h3" },
  { name: "text-h4", className: "text-h4" },
  { name: "text-sm (paragraph small)", className: "text-sm" },
  { name: "text-sm text-muted-foreground", className: "text-sm text-muted-foreground" },
  { name: "font-mono", className: "font-mono text-sm" },
] as const

const RADII = ["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-full"] as const

export function FoundationsSection() {
  return (
    <>
      <ShowcaseSection
        id="colors"
        title="Barvy"
        description="Sémantické tokeny z global.css. Přepněte motiv v hlavičce a zkontrolujte tmavý režim."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {COLOR_TOKENS.map((token) => (
            <li
              key={token.name}
              className="space-y-1.5"
            >
              <div className={`h-12 rounded-md border border-border ${token.className}`} />
              <p className="font-mono text-xs break-all">{token.name}</p>
            </li>
          ))}
        </ul>
      </ShowcaseSection>

      <ShowcaseSection
        id="typography"
        title="Typografie"
        description="Space Grotesk pro text, Geist Mono pro kód a čísla v tabulkách."
      >
        <div className="space-y-4">
          {TYPE_STYLES.map((style) => (
            <div
              key={style.name}
              className="grid gap-1 sm:grid-cols-[14rem_1fr] sm:items-baseline"
            >
              <p className="font-mono text-xs text-muted-foreground">{style.name}</p>
              <p className={style.className}>Letní tábor Příliš žluťoučký kůň 2027</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="radius"
        title="Zaoblení"
        description="--radius je 10 px; md a sm se odvozují (8 a 6 px)."
      >
        <div className="flex flex-wrap gap-4">
          {RADII.map((radius) => (
            <div
              key={radius}
              className="space-y-1.5"
            >
              <div className={`size-16 border border-border bg-muted ${radius}`} />
              <p className="font-mono text-xs">{radius}</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>
    </>
  )
}
