import { History } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

import { RetryAlert } from "@/features/accommodation/components/RetryAlert"

type HistoryBase = {
  id: string
  /** Already formatted, e.g. "dnes 14:32". */
  at: string
  /** Who did it, e.g. "Marie Králová"; "Automaticky" for a run the system started. */
  author: string
}

/** A stored run of the evaluation (accommodation_run). */
export type HistoryRun = HistoryBase & {
  kind: "run"
  termLabel: string
  status: "solved" | "infeasible" | "timeout" | "failed"
  /** E.g. "11 vhodných · 3 neubytovatelní · 2 ruční určení". */
  summary?: string
}

/** A manual change of position (accommodation_intervention, kind position). */
export type HistoryMove = HistoryBase & {
  kind: "move"
  person: string
  /** E.g. "1. turnus · fronta Žena". */
  queueLabel: string
  fromPosition: number
  toPosition: number
  reason: string
}

/** A determination of the effective value (accommodation_intervention, kind manual_value). */
export type HistoryDetermination = HistoryBase & {
  kind: "determination"
  person: string
  answer: string
  value: string
  reason: string
}

/** One person's decision in one term (F14-1), individual or from a bulk confirmation. */
export type HistoryDecision = HistoryBase & {
  kind: "decision"
  person: string
  termLabel: string
  fromState: string
  toState: string
  /** The proposal or the individual decision used, e.g. "Hromadně z návrhu z 14:32". */
  basis: string
}

/** A bulk confirmation of a term's proposal, one entry for the whole batch. */
export type HistoryBulk = HistoryBase & {
  kind: "bulk"
  termLabel: string
  count: number
  /** E.g. "Návrh z 14:32". */
  basis: string
}

export type HistoryEntry =
  HistoryRun | HistoryMove | HistoryDetermination | HistoryDecision | HistoryBulk

export type EvaluationHistoryProps = {
  /** E.g. "Historie termínu" or "Historie vyhodnocení". */
  title: string
  entries: HistoryEntry[]
  /** The history could not be loaded; never shown as an empty history. */
  isLoadFailed?: boolean
  onRetry?: () => void
  /** Opens the evidence of a run; without it the run has no "Doklad". */
  onOpenRun?: (runId: string) => void
}

const RUN_BADGE: Record<
  HistoryRun["status"],
  { label: string; variant: "secondary" | "destructive-subtle" }
> = {
  solved: { label: "Spočítáno", variant: "secondary" },
  infeasible: { label: "Konflikt", variant: "destructive-subtle" },
  timeout: { label: "Nedoběhlo", variant: "destructive-subtle" },
  failed: { label: "Selhalo", variant: "destructive-subtle" },
}

function EntryBody({
  entry,
  onOpenRun,
}: {
  entry: HistoryEntry
  onOpenRun?: (runId: string) => void
}) {
  switch (entry.kind) {
    case "run":
      return (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">Vyhodnocení · {entry.termLabel}</p>
              <Badge variant={RUN_BADGE[entry.status].variant}>
                {RUN_BADGE[entry.status].label}
              </Badge>
            </div>
            {entry.summary ? <p>{entry.summary}</p> : null}
          </div>
          {onOpenRun ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenRun(entry.id)}
            >
              Doklad
            </Button>
          ) : null}
        </div>
      )
    case "move":
      return (
        <div className="space-y-1">
          <p className="font-medium">
            Změna pořadí · {entry.person} · {entry.queueLabel}
          </p>
          <p>
            Z {entry.fromPosition}. na {entry.toPosition}. místo v pořadí termínu
          </p>
          <p className="break-words">Důvod: {entry.reason}</p>
        </div>
      )
    case "determination":
      return (
        <div className="space-y-1">
          <p className="font-medium">Určení ubytování · {entry.person}</p>
          <p>
            Odpověď {entry.answer} → ubytovat jako {entry.value}, všechny termíny
          </p>
          <p className="break-words">Důvod: {entry.reason}</p>
        </div>
      )
    case "decision":
      return (
        <div className="space-y-1">
          <p className="font-medium">
            {entry.person} · {entry.termLabel}
          </p>
          <p>
            {entry.fromState} → {entry.toState}
          </p>
          <p className="text-muted-foreground">{entry.basis}</p>
        </div>
      )
    case "bulk":
      return (
        <div className="space-y-1">
          <p className="font-medium">Hromadné potvrzení · {entry.termLabel}</p>
          <p>Potvrzeno {entry.count} účastí</p>
          <p className="text-muted-foreground">{entry.basis}</p>
        </div>
      )
  }
}

// Správa akce → Přihlášky → Vyhodnocení → vybraný termín, and detail přihlášky
// (F39-1): the immutable record of runs, order changes, determinations and
// decisions, newest first. No entry can be edited or deleted. Design only:
// every value is passed in.
export function EvaluationHistory({
  title,
  entries,
  isLoadFailed = false,
  onRetry,
  onOpenRun,
}: EvaluationHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadFailed ? (
          <RetryAlert
            title="Historii se nepodařilo načíst"
            onRetry={onRetry}
          />
        ) : entries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <History />
              </EmptyMedia>
              <EmptyTitle>Historie zatím neobsahuje záznamy</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="divide-y divide-border text-sm">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="space-y-2 py-3 first:pt-0 last:pb-0"
              >
                <p className="text-muted-foreground">
                  {entry.at} · {entry.author}
                </p>
                <EntryBody
                  entry={entry}
                  onOpenRun={onOpenRun}
                />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
