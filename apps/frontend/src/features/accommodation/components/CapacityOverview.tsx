import { BedDouble, CircleAlert, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type ProposalStatus = "current" | "stale" | "computing" | "failed" | "conflict"

/** The evaluation proposal of one term. Counts are the result of the rules, not a bed sum. */
export type TermProposal = {
  status: ProposalStatus
  /** Already formatted, e.g. "dnes 14:32". */
  calculatedAt: string
  /** Would be accommodated. */
  suitable: number
  /** Reasons A, B, C or N. */
  unaccommodatable: number
  /** Reason R. */
  manual: number
  /** Only for `conflict`. */
  conflict?: { constraint: string; affected: string[] }
}

export type CapacityTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027". */
  dates: string
  confirmed: number
  pending: number
  waitlisted: number
  beds: number
  extraBeds: number
  /** Beds plus extra beds of the rooms available in the term. */
  capacity: number
  /** Rooms exist for the event at all. */
  hasRooms: boolean
  proposal: TermProposal
}

export type CapacityOverviewProps = {
  terms: CapacityTerm[]
  selectedTermId: string
  /** The load failed: an error with a retry instead of numbers. */
  loadError?: string
  onRecalculate?: () => void
  onConfirmSuitable?: () => void
  onRetry?: () => void
}

const STATUS_BADGE: Record<
  ProposalStatus,
  { label: string; variant: "success" | "warning" | "destructive-subtle" | "outline" }
> = {
  current: { label: "Aktuální návrh", variant: "success" },
  stale: { label: "Neaktuální návrh", variant: "warning" },
  computing: { label: "Počítá se…", variant: "outline" },
  failed: { label: "Výpočet selhal", variant: "destructive-subtle" },
  conflict: { label: "Konflikt", variant: "destructive-subtle" },
}

// Správa akce → Přehled → Kapacita a návrh vyhodnocení (F17-1). Design only:
// every value is passed in. No person is placed in a room.
export function CapacityOverview({
  terms,
  selectedTermId,
  loadError,
  onRecalculate,
  onConfirmSuitable,
  onRetry,
}: CapacityOverviewProps) {
  return (
    <section aria-labelledby="capacity-overview-heading">
      <h2
        id="capacity-overview-heading"
        className="mb-4 text-h4"
      >
        Kapacita a návrh vyhodnocení
      </h2>

      {loadError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Přehled se nepodařilo načíst</AlertTitle>
          <AlertDescription>
            <p>{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onRetry}
            >
              <RefreshCw />
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue={selectedTermId}>
          <TabsList aria-label="Termín">
            {terms.map((term) => (
              <TabsTrigger
                key={term.id}
                value={term.id}
              >
                {term.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {terms.map((term) => (
            <TabsContent
              key={term.id}
              value={term.id}
            >
              <div className="mt-2 space-y-4">
                <ParticipationCard term={term} />
                <CapacityCard term={term} />
                <ProposalCard
                  term={term}
                  onRecalculate={onRecalculate}
                  onConfirmSuitable={onConfirmSuitable}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  )
}

function ParticipationCard({ term }: { term: CapacityTerm }) {
  return (
    <Card>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          {term.label}, {term.dates}
        </p>
        <dl className="grid grid-cols-3 gap-4">
          <Stat
            label="Potvrzeno"
            value={term.confirmed}
          />
          <Stat
            label="Čeká na rozhodnutí"
            value={term.pending}
          />
          <Stat
            label="Náhradníci"
            value={term.waitlisted}
          />
        </dl>
      </CardContent>
    </Card>
  )
}

function CapacityCard({ term }: { term: CapacityTerm }) {
  const free = Math.max(term.capacity - term.confirmed, 0)
  const percent = term.capacity === 0 ? 0 : Math.min((term.confirmed / term.capacity) * 100, 100)

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <h3 className="text-base font-medium">Kapacita termínu</h3>
          {!term.hasRooms ? (
            <Alert>
              <BedDouble />
              <AlertTitle>Ubytovací kapacita není evidovaná</AlertTitle>
              <AlertDescription>Akce zatím nemá žádné pokoje.</AlertDescription>
            </Alert>
          ) : term.capacity === 0 ? (
            <Alert>
              <BedDouble />
              <AlertTitle>V termínu není dostupný žádný pokoj</AlertTitle>
              <AlertDescription>Dostupná kapacita je 0.</AlertDescription>
            </Alert>
          ) : null}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Základní lůžka"
              value={term.beds}
            />
            <Stat
              label="Přistýlky"
              value={term.extraBeds}
            />
            <Stat
              label="Kapacita termínu"
              value={term.capacity}
            />
            <Stat
              label="Volná místa"
              value={free}
            />
          </dl>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Potvrzeno z kapacity</span>
              <span className="font-medium">
                {term.confirmed} / {term.capacity}
              </span>
            </div>
            <Progress
              value={percent}
              aria-label="Potvrzení účastníci z kapacity termínu"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type ProposalCardProps = {
  term: CapacityTerm
  onRecalculate?: (() => void) | undefined
  onConfirmSuitable?: (() => void) | undefined
}

function ProposalCard({ term, onRecalculate, onConfirmSuitable }: ProposalCardProps) {
  const { proposal } = term
  const badge = STATUS_BADGE[proposal.status]
  const isComputing = proposal.status === "computing"
  const canConfirm = proposal.status === "current" && proposal.suitable > 0
  const isOutdated = proposal.status !== "current"

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-medium">Návrh vyhodnocení</h3>
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <span className="text-sm text-muted-foreground">
                Poslední přepočet {proposal.calculatedAt}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={isComputing}
                onClick={onRecalculate}
              >
                <RefreshCw />
                Přepočítat
              </Button>
              <Button
                disabled={!canConfirm}
                onClick={onConfirmSuitable}
              >
                Potvrdit vhodné
              </Button>
            </div>
          </div>

          {proposal.status === "stale" ? (
            <Alert>
              <CircleAlert />
              <AlertTitle>Návrh je neaktuální</AlertTitle>
              <AlertDescription>
                Kapacita nebo přihlášky se od posledního přepočtu změnily. Hromadné potvrzení je
                dostupné až po přepočtu.
              </AlertDescription>
            </Alert>
          ) : null}
          {proposal.status === "failed" ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Výpočet selhal</AlertTitle>
              <AlertDescription>
                Zobrazený návrh je starší a je neaktuální. Zkuste přepočet znovu.
              </AlertDescription>
            </Alert>
          ) : null}
          {proposal.status === "conflict" && proposal.conflict ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Návrh nelze sestavit</AlertTitle>
              <AlertDescription>
                <p>{proposal.conflict.constraint}</p>
                <p className="mt-1">
                  Dotčení potvrzení účastníci: {proposal.conflict.affected.join(", ")}
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          <dl
            className="grid grid-cols-3 gap-4"
            aria-label={isOutdated ? "Počty z neaktuálního návrhu" : "Počty z aktuálního návrhu"}
          >
            <Stat
              label="Vhodní"
              value={proposal.suitable}
              isMuted={isOutdated}
            />
            <Stat
              label="Neubytovatelní"
              value={proposal.unaccommodatable}
              isMuted={isOutdated}
            />
            <Stat
              label="Ruční určení"
              value={proposal.manual}
              isMuted={isOutdated}
            />
          </dl>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, isMuted }: { label: string; value: number; isMuted?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={isMuted ? "text-h3 text-muted-foreground" : "text-h3"}>{value}</dd>
    </div>
  )
}
