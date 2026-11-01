import { History, RotateCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

type QueueHistoryBase = {
  id: string
  /** Already formatted, e.g. "dnes 14:32". */
  at: string
  /** Who did it, e.g. "Marie Králová" or "Automatický režim". */
  author: string
  /** The term, e.g. "1. turnus"; shown where the entry stands outside its queue. */
  termLabel?: string
}

export type QueueHistoryEvaluation = QueueHistoryBase & {
  kind: "evaluation"
  /** E.g. "11 vhodných · 3 neubytovatelní · 2 ruční určení". */
  summary: string
  /** Version of the inputs the run used, e.g. "Verze vstupů 14". */
  inputVersion: string
  /** Names in the stored order. */
  order: string[]
}

export type QueueHistoryMove = QueueHistoryBase & {
  kind: "move"
  personName: string
  placementText: string
  reason: string
  originalOrder: string[]
  newOrder: string[]
}

export type QueueHistoryDecision = QueueHistoryBase & {
  kind: "decision"
  personName: string
  fromState: string
  toState: string
  /** The proposal or manual decision used, e.g. "Návrh z 14:32". */
  basis: string
}

export type QueueHistoryEntry = QueueHistoryEvaluation | QueueHistoryMove | QueueHistoryDecision

export type QueueHistoryListProps = {
  entries: QueueHistoryEntry[]
  /** The history could not be loaded; never rendered as an empty history. */
  isLoadFailed?: boolean
  onRetry?: () => void
}

const KIND_LABELS = {
  evaluation: "Vyhodnocení",
  move: "Ruční zásah",
  decision: "Rozhodnutí",
} as const

function orderText(names: string[]) {
  return names.map((name, index) => `${index + 1}. ${name}`).join(", ")
}

function Detail({ term, children }: { term: string; children: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-muted-foreground sm:w-32">{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function QueueHistoryEntryItem({ entry }: { entry: QueueHistoryEntry }) {
  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant={entry.kind === "move" ? "warning" : "secondary"}>
          {KIND_LABELS[entry.kind]}
        </Badge>
        <span className="text-sm font-medium">
          {entry.kind === "evaluation" ? "Uložené vyhodnocení" : null}
          {entry.kind === "move" ? `Přesun: ${entry.personName} ${entry.placementText}` : null}
          {entry.kind === "decision" ? entry.personName : null}
        </span>
        <span className="text-sm text-muted-foreground">
          {entry.at} · {entry.author}
          {entry.termLabel ? ` · ${entry.termLabel}` : ""}
        </span>
      </div>
      <dl className="space-y-1 text-sm">
        {entry.kind === "evaluation" ? (
          <>
            <Detail term="Výsledek">{entry.summary}</Detail>
            <Detail term="Podklady">{entry.inputVersion}</Detail>
            <Detail term="Pořadí">{orderText(entry.order)}</Detail>
          </>
        ) : null}
        {entry.kind === "move" ? (
          <>
            <Detail term="Důvod">{entry.reason}</Detail>
            <Detail term="Původní pořadí">{orderText(entry.originalOrder)}</Detail>
            <Detail term="Nové pořadí">{orderText(entry.newOrder)}</Detail>
          </>
        ) : null}
        {entry.kind === "decision" ? (
          <>
            <Detail term="Změna stavu">{`${entry.fromState} → ${entry.toState}`}</Detail>
            <Detail term="Podklad">{entry.basis}</Detail>
          </>
        ) : null}
      </dl>
    </li>
  )
}

// Neměnná historie vyhodnocení a ručních zásahů, nejnovější první (F39-1).
// Entries can only be added; nothing offers editing or deleting them.
export function QueueHistoryList({
  entries,
  isLoadFailed = false,
  onRetry,
}: QueueHistoryListProps) {
  if (isLoadFailed) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Historii se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
        <AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            <RotateCw />
            Zkusit znovu
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <History />
          </EmptyMedia>
          <EmptyTitle>Zatím žádná historie</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <QueueHistoryEntryItem
          key={entry.id}
          entry={entry}
        />
      ))}
    </ul>
  )
}
