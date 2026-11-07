import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  RESULT_BADGE,
  type ProposalResult,
  type ReasonCode,
} from "@/features/accommodation/lib/proposal"

export type EvidenceRoom = { id: string; label: string; baseBeds: number; extraBeds: number }

/** One person of the stored order, as the run used them (EvaluationSnapshot). */
export type EvidencePerson = {
  id: string
  position: number
  name: string
  /** Already formatted, e.g. "12. 3. 2027 18:41:07.120". */
  receivedAt: string
  answer: string
  /** The determination valid for that answer, e.g. "Žena". */
  determinedAs?: string
  /** Missing when the run produced no proposal (failed, timed out, conflict). */
  result?: ProposalResult
  reason?: ReasonCode
}

export type RunEvidenceSheetProps = {
  isOpen: boolean
  /** E.g. "1. turnus · dnes 14:32". */
  runLabel: string
  /** "Automaticky" or the organizer who started it. */
  startedBy: string
  /** E.g. "highs-phase1/1". */
  solverVersion: string
  /** The hard attribute and its non-determining answers; null when there was none. */
  rules: { attribute: string; nonDetermining: string[] } | null
  rooms: EvidenceRoom[]
  confirmedCount: number
  /** A manual order (F39-1) applied to the run. */
  isOrderManual: boolean
  order: EvidencePerson[]
  onOpenChange?: (isOpen: boolean) => void
  /** What the run ended with when it produced no proposal, already worded. */
  outcome?: string
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  )
}

// Správa akce → Přihlášky → Vyhodnocení → Historie → Doklad (F39-1): what one
// stored run decided from (spec v4 §9 snapshot): rules, the rooms and beds of
// the term, the order with each answer and determination, and the result. A
// later change of inputs or rules does not rewrite it. Design only: every
// value is passed in.
export function RunEvidenceSheet({
  isOpen,
  runLabel,
  startedBy,
  solverVersion,
  rules,
  rooms,
  confirmedCount,
  isOrderManual,
  order,
  onOpenChange,
  outcome,
}: RunEvidenceSheetProps) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Doklad vyhodnocení</SheetTitle>
          <SheetDescription>{runLabel}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 overflow-y-auto px-4 pb-6 text-sm">
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-muted-foreground">Spustil</dt>
              <dd>{startedBy}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Verze výpočtu</dt>
              <dd className="font-mono">{solverVersion}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Určuje pokoj</dt>
              <dd>{rules ? rules.attribute : "Nic, jen kapacita a pořadí"}</dd>
            </div>
            {rules ? (
              <div>
                <dt className="text-muted-foreground">Neurčující odpovědi</dt>
                <dd>{rules.nonDetermining.join(", ")}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Potvrzení v termínu</dt>
              <dd>{confirmedCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pořadí</dt>
              <dd>{isOrderManual ? "Ručně upravené" : "Podle času přihlášení"}</dd>
            </div>
            {outcome ? (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Výsledek</dt>
                <dd className="break-words">{outcome}</dd>
              </div>
            ) : null}
          </dl>

          <Section title="Dostupné pokoje">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pokoj</TableHead>
                  <TableHead className="text-right">Lůžka</TableHead>
                  <TableHead className="text-right">Přistýlky</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell>{room.label}</TableCell>
                    <TableCell className="text-right">{room.baseBeds}</TableCell>
                    <TableCell className="text-right">{room.extraBeds}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section title="Pořadí a výsledek">
            <ol className="divide-y divide-border">
              {order.map((person) => (
                <li
                  key={person.id}
                  className="space-y-1 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>
                      {person.position}. {person.name}
                    </p>
                    {person.result ? (
                      <Badge variant={RESULT_BADGE[person.result].variant}>
                        {RESULT_BADGE[person.result].label}
                        {person.reason ? ` · ${person.reason}` : ""}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {person.receivedAt}
                    {rules ? ` · ${person.answer}` : ""}
                    {person.determinedAs ? ` → určeno ${person.determinedAs}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          <SheetClose asChild>
            <Button variant="outline">Zavřít</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
