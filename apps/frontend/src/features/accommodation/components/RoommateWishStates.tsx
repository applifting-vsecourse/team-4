import { HeartHandshake } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageSection } from "@/components/PageSection"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { WishState } from "@/features/accommodation/api/roomProposalSchemas"
import { wishStateBadge, type WishRow } from "@/features/accommodation/lib/roomProposalView"

export type RoommateWishStatesProps = {
  rows: WishRow[]
  /** The hard attribute, e.g. "Pohlaví"; for "Nelze splnit". */
  attribute?: string | null
  /**
   * The proposal the "Podle návrhu" column reads: none yet, the current one,
   * or the last finished one after the term changed.
   */
  proposal: "none" | "current" | "stale" | "failed"
  isLoading?: boolean
  isLoadFailed?: boolean
  /** Reloads what failed: the wishes, or the proposal for its column. */
  onRetryLoad?: () => void
}

function State({ state, attribute }: { state: WishState; attribute?: string | null }) {
  const badge = wishStateBadge(state, attribute)
  return <Badge variant={badge.variant}>{badge.label}</Badge>
}

const PROPOSAL_NOTE = {
  none: "Termín zatím nemá návrh pokojů.",
  failed: undefined,
  current: "Podle návrhu: stav, kdyby se použil zobrazený návrh pokojů.",
  stale: "Podle návrhu: poslední dokončený návrh, podklady se od něj změnily.",
}

// Správa akce → Ubytování → vybraný termín → Přání na spolubydlící (#317): the
// state of every usable one-sided wish between two people confirmed in the
// term, in the saved placements and, apart from it, in the proposal. A state
// never blocks or changes a placement. Design only: every value is passed in.
export function RoommateWishStates({
  rows,
  attribute,
  proposal,
  isLoading = false,
  isLoadFailed = false,
  onRetryLoad,
}: RoommateWishStatesProps) {
  return (
    <PageSection
      title="Přání na spolubydlící"
      description={rows.length > 0 ? PROPOSAL_NOTE[proposal] : undefined}
    >
      {isLoadFailed ? (
        <LoadError
          title="Přání na spolubydlící se nepodařilo načíst"
          onRetry={onRetryLoad}
        />
      ) : isLoading ? (
        <LoadingBlock label="Načítání přání na spolubydlící">
          <Skeleton className="h-40 w-full" />
        </LoadingBlock>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="V termínu nejsou přání na spolubydlící"
          description="Zobrazí se přání mezi dvěma potvrzenými účastníky termínu."
        />
      ) : (
        <div className="space-y-4">
          {proposal === "failed" ? (
            <LoadError
              title="Návrh pokojů se nepodařilo načíst"
              description="Sloupec Podle návrhu je prázdný; uložený stav platí."
              onRetry={onRetryLoad}
            />
          ) : null}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Účastník</TableHead>
                  <TableHead>Chce bydlet s</TableHead>
                  <TableHead>Uložené rozdělení</TableHead>
                  <TableHead>Podle návrhu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-normal">{row.from}</TableCell>
                    <TableCell className="whitespace-normal">{row.to}</TableCell>
                    <TableCell>
                      <State
                        state={row.saved}
                        attribute={attribute}
                      />
                    </TableCell>
                    <TableCell>
                      {row.proposed ? (
                        <State
                          state={row.proposed}
                          attribute={attribute}
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {proposal === "failed" ? "Nenačteno" : "Bez návrhu"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </PageSection>
  )
}
