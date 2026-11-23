import { useEffect, useRef, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarX, Eye, Settings, Sparkles } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { FormError } from "@/components/FormError"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageSection } from "@/components/PageSection"
import { PendingButton } from "@/components/PendingButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { readApiError } from "@/lib/apiError"
import { formatPragueDateTime } from "@/lib/date"

import { termRoomProposalQueryOptions } from "@/features/accommodation/api/roomProposalQueryOptions"
import type { RoomProposalStatus } from "@/features/accommodation/api/roomProposalSchemas"
import { ApplyProposalAction } from "@/features/accommodation/components/ApplyProposalAction"
import {
  RoomProposal,
  RoomProposalFrame,
  type RoomProposalProps,
} from "@/features/accommodation/components/RoomProposal"
import { RoomSplitRulesDialog } from "@/features/accommodation/components/RoomSplitRulesDialog"
import { useAttributeLabels } from "@/features/accommodation/hooks/useAttributeLabels"
import { useProposeRooms } from "@/features/accommodation/hooks/useProposeRooms"
import { AttributeLabelsContext } from "@/features/accommodation/lib/attributeLabelsContext"
import { toEvaluationTerm } from "@/features/accommodation/lib/evaluationView"
import {
  asApplied,
  hasApplyChanges,
  PROPOSAL_STATUS_BADGE,
  toApplyChanges,
  toProposalLayout,
  type RoomProposalLayout,
} from "@/features/accommodation/lib/roomProposalView"

type Term = { id: string; label: string; startDate: string; endDate: string }

export type RoomProposalSectionProps = {
  /** The hard attribute, e.g. "Pohlaví"; for the reason H. */
  attribute?: string | null
  organizationId: string
  eventId: string
  /** The event's terms, by start. */
  terms: Term[]
  /** The term the page's tabs selected; "" when the event has none. */
  termId: string
  /** The summary belongs above saved placements; the full view is opened separately. */
  presentation?: "summary" | "full"
  onViewProposal?: () => void
  onProposalReady?: (termId: string) => void
  canAutoOpen?: boolean
  onApplied?: () => void
}

const PROPOSE_FAILED = "Zkuste to prosím znovu."

// Ubytování → Návrh pokojů (#385): the room proposal of the selected term.
// Reading never proposes; "Navrhnout pokoje" queues a proposal and the term
// is read again until it is stored. The last usable proposal stays shown
// while a new one runs or after one fails. "Použít návrh" (#390) saves the
// shown proposal while it is current.
export function RoomProposalSection(props: RoomProposalSectionProps) {
  const labels = useAttributeLabels(props.organizationId, props.eventId)
  return (
    <AttributeLabelsContext.Provider value={labels}>
      <RoomProposalSectionContent {...props} />
    </AttributeLabelsContext.Provider>
  )
}

function RoomProposalSectionContent({
  attribute,
  organizationId,
  eventId,
  terms,
  termId,
  presentation = "full",
  onViewProposal,
  onProposalReady,
  canAutoOpen = true,
  onApplied,
}: RoomProposalSectionProps) {
  const hasTerm = termId !== ""
  const proposal = useQuery({
    ...termRoomProposalQueryOptions(organizationId, eventId, termId),
    enabled: hasTerm,
    placeholderData: keepPreviousData,
  })
  const propose = useProposeRooms(organizationId, eventId, termId)
  const waitingForProposal = useRef<{ termId: string; previousId: string | null } | null>(null)
  // A request on its way belongs to the term it was made for, also after Back/Forward.
  const { reset } = propose
  useEffect(() => {
    reset()
    waitingForProposal.current = null
  }, [reset, termId])

  useEffect(() => {
    const waiting = waitingForProposal.current
    const finished = proposal.data?.lastSolved
    if (waiting && !canAutoOpen) {
      waitingForProposal.current = null
      return
    }
    if (
      waiting?.termId !== termId ||
      proposal.isPlaceholderData ||
      proposal.data?.status === "running" ||
      (proposal.data?.status !== "current" && proposal.data?.status !== "stale") ||
      !finished ||
      finished.id === waiting.previousId ||
      finished.status !== "solved" ||
      !finished.layout
    ) {
      return
    }

    waitingForProposal.current = null
    onProposalReady?.(waiting.termId)
  }, [canAutoOpen, onProposalReady, proposal.data, proposal.isPlaceholderData, termId])

  if (terms.length === 0) {
    return (
      <RoomProposalFrame>
        <EmptyState
          icon={CalendarX}
          title="Akce zatím nemá žádný termín"
        />
      </RoomProposalFrame>
    )
  }

  const common = {
    terms: terms.map(toEvaluationTerm),
    selectedTermId: termId,
  }
  const unknownTerm = { ...common, mode: "manual", status: "none" } satisfies RoomProposalProps

  if (proposal.isPending) {
    if (presentation === "summary") {
      return (
        <ProposalSummary
          isLoading
          organizationId={organizationId}
          eventId={eventId}
        />
      )
    }
    return (
      <RoomProposal
        {...unknownTerm}
        isLoading
      />
    )
  }
  // A failed poll keeps what was shown; only a term never loaded is an error.
  if (proposal.isError && !proposal.data) {
    if (presentation === "summary") {
      return (
        <ProposalSummary
          isLoadFailed
          onRetryLoad={() => void proposal.refetch()}
          organizationId={organizationId}
          eventId={eventId}
        />
      )
    }
    return (
      <RoomProposal
        {...unknownTerm}
        isLoadFailed
        onRetryLoad={() => void proposal.refetch()}
      />
    )
  }
  const data = proposal.data
  if (!data) return null
  const shown = data.lastSolved
  const proposed = shown?.layout ? toProposalLayout(shown.layout) : undefined
  // Applied and nothing changed since: the saved placements are its rooms.
  const layout = proposed && shown?.appliedAt ? asApplied(proposed) : proposed
  const term = common.terms.find((t) => t.id === termId)
  const status = propose.isPending ? "running" : data.status
  const proposeError = propose.isError
    ? (readApiError(propose.error).message ?? PROPOSE_FAILED)
    : undefined

  if (presentation === "summary") {
    return (
      <ProposalSummary
        term={term ? `${term.label}, ${term.dates}` : undefined}
        mode={data.mode}
        hardRule={
          attribute
            ? `Rozdělení podle ${attribute.toLocaleLowerCase("cs")}`
            : "Bez tvrdého pravidla"
        }
        status={status}
        layout={layout}
        proposedAt={shown ? formatPragueDateTime(shown.finishedAt) : undefined}
        scheduledAt={data.scheduledAt ? formatPragueDateTime(data.scheduledAt) : undefined}
        isSwitching={proposal.isPlaceholderData}
        isRunning={status === "running"}
        proposeError={proposeError}
        onPropose={() => {
          waitingForProposal.current = { termId, previousId: data.lastSolved?.id ?? null }
          propose.mutate()
        }}
        onViewProposal={onViewProposal}
        organizationId={organizationId}
        eventId={eventId}
      />
    )
  }

  return (
    <RoomProposal
      {...common}
      attribute={attribute}
      proposalHardAttribute={shown?.hardAttribute ?? null}
      isSwitching={proposal.isPlaceholderData}
      mode={data.mode}
      // While the request is on its way the term already reads as running.
      status={status}
      layout={layout}
      proposedAt={shown ? formatPragueDateTime(shown.finishedAt) : undefined}
      isShownStale={shown ? !shown.isCurrent && !shown.appliedAt : false}
      hasApplyAction={Boolean(
        shown?.isCurrent && proposed && hasApplyChanges(toApplyChanges(proposed)),
      )}
      onPropose={() => propose.mutate()}
      applyAction={
        // The dialog reviews the proposal's own changes, also while the
        // refetch after applying turns the shown layout into the applied one.
        shown && proposed && term ? (
          <ApplyProposalAction
            // A new term closes the dialog: it reviewed this term's proposal.
            key={termId}
            organizationId={organizationId}
            eventId={eventId}
            termId={termId}
            term={`${term.label}, ${term.dates}`}
            proposalId={shown.id}
            layout={proposed}
            canApply={shown.isCurrent && status !== "running"}
            onPropose={() => propose.mutate()}
            onApplied={onApplied}
          />
        ) : null
      }
      proposeError={proposeError}
    />
  )
}

function ProposalSummary({
  term,
  mode,
  hardRule,
  status = "none",
  layout,
  proposedAt,
  scheduledAt,
  isLoading = false,
  isLoadFailed = false,
  isSwitching = false,
  isRunning = false,
  proposeError,
  onPropose,
  onViewProposal,
  onRetryLoad,
  organizationId,
  eventId,
}: {
  term?: string
  mode?: "automatic" | "manual"
  hardRule?: string
  status?: RoomProposalStatus
  layout?: RoomProposalLayout
  proposedAt?: string
  scheduledAt?: string
  isLoading?: boolean
  isLoadFailed?: boolean
  isSwitching?: boolean
  isRunning?: boolean
  proposeError?: string
  onPropose?: () => void
  onViewProposal?: () => void
  onRetryLoad?: () => void
  organizationId: string
  eventId: string
}) {
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const badge = PROPOSAL_STATUS_BADGE[status]
  const canRetry = status === "stale" || status === "failed" || status === "timeout"

  return (
    <PageSection title="Návrh pokojů">
      {isLoadFailed ? (
        <LoadError
          title="Návrh pokojů se nepodařilo načíst"
          onRetry={onRetryLoad}
        />
      ) : isLoading ? (
        <LoadingBlock label="Načítání stavu návrhu pokojů">
          <Skeleton className="h-20 w-full" />
        </LoadingBlock>
      ) : (
        <Card
          inert={isSwitching}
          aria-busy={isSwitching}
        >
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                {term ? <p className="font-medium">{term}</p> : null}
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <span className="text-sm text-muted-foreground">{hardRule}</span>
                {layout ? (
                  <span className="text-sm text-muted-foreground">
                    {layout.summary.placed} umístění · {layout.summary.moved} přesunů
                    {proposedAt ? ` · návrh z ${proposedAt}` : ""}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {scheduledAt
                      ? `Návrh se spustí ${scheduledAt}.`
                      : mode === "automatic"
                        ? "Návrh vznikne automaticky po změně podkladů."
                        : "Návrh zatím nevznikl."}
                  </span>
                )}
              </div>
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRulesOpen(true)}
                >
                  <Settings aria-hidden="true" />
                  Upravit pravidla
                </Button>
                {layout ? (
                  <Button
                    variant="outline"
                    onClick={onViewProposal}
                  >
                    <Eye aria-hidden="true" />
                    Zobrazit návrh
                  </Button>
                ) : null}
                {!layout || canRetry || isRunning ? (
                  <PendingButton
                    variant="default"
                    isPending={isRunning}
                    icon={<Sparkles aria-hidden="true" />}
                    onClick={onPropose}
                  >
                    {isRunning ? "Navrhuje se…" : "Navrhnout pokoje"}
                  </PendingButton>
                ) : null}
              </div>
            </div>
            {proposeError ? (
              <div className="mt-3">
                <FormError
                  title="Návrh pokojů se nepodařilo spustit"
                  message={proposeError}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
      <RoomSplitRulesDialog
        organizationId={organizationId}
        eventId={eventId}
        isOpen={isRulesOpen}
        onOpenChange={setIsRulesOpen}
      />
    </PageSection>
  )
}
