import type { ReactNode } from "react"
import { BedDouble, Lock, Sparkles, Users } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { FormError } from "@/components/FormError"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Notice } from "@/components/Notice"
import { PageSection } from "@/components/PageSection"
import { PendingButton } from "@/components/PendingButton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { RoomProposalStatus } from "@/features/accommodation/api/roomProposalSchemas"
import type { EvaluationTerm } from "@/features/accommodation/components/TermEvaluation"
import { attributeLabel, valueLabel } from "@/features/accommodation/lib/evaluationView"
import {
  PROPOSAL_STATUS_BADGE,
  unplacedReasonText,
  type ProposalPerson,
  type RoomProposalLayout,
} from "@/features/accommodation/lib/roomProposalView"

export type RoomProposalProps = {
  terms: EvaluationTerm[]
  selectedTermId: string
  mode: "automatic" | "manual"
  status: RoomProposalStatus
  /** The shown layout: the last usable proposal of the term. */
  layout?: RoomProposalLayout
  /** When the shown layout was proposed, e.g. "dnes 14:32". */
  proposedAt?: string
  /** The shown layout no longer matches the term (a later run failed after a change). */
  isShownStale?: boolean
  hasApplyAction?: boolean
  /** The hard attribute, e.g. "Pohlaví"; for the reason H. */
  attribute?: string | null
  /** The rule stored with the shown calculation, independent of current settings. */
  proposalHardAttribute?: string | null
  /** The term could not be loaded; nothing else is shown as valid. */
  isLoadFailed?: boolean
  /** The term is loading: the term tabs stay, the content is a placeholder. */
  isLoading?: boolean
  /** Another term is loading: the previous one stays shown but inert. */
  isSwitching?: boolean
  onPropose?: () => void
  /**
   * "Použít návrh" (#390) beside "Navrhnout pokoje". Always rendered: the
   * action hides its own button, so its dialog outlives a refetch that makes
   * the proposal stale.
   */
  applyAction?: ReactNode
  /** "Navrhnout pokoje" was refused or failed, already worded; the shown data stay. */
  proposeError?: string
  onRetryLoad?: () => void
}

function count(n: number, one: string, few: string, many: string) {
  if (n === 1) return `${n} ${one}`
  if (n >= 2 && n <= 4) return `${n} ${few}`
  return `${n} ${many}`
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-h3">{value}</dd>
    </div>
  )
}

function Summary({ layout }: { layout: RoomProposalLayout }) {
  const { summary } = layout
  return (
    <Card>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Umístění"
            value={summary.placed}
          />
          <Stat
            label="Bez pokoje"
            value={summary.unplaced}
          />
          <Stat
            label="Obsazené pokoje"
            value={summary.rooms}
          />
          <Stat
            label="Přistýlky"
            value={summary.extraBeds}
          />
        </dl>
        <p className="mt-4 text-sm">
          Oproti uloženému rozdělení:{" "}
          {summary.added + summary.moved + summary.removed === 0
            ? "beze změn"
            : [
                summary.added > 0
                  ? count(summary.added, "nové umístění", "nová umístění", "nových umístění")
                  : null,
                summary.moved > 0 ? count(summary.moved, "přesun", "přesuny", "přesunů") : null,
                summary.removed > 0
                  ? count(summary.removed, "odebrání pokoje", "odebrání pokoje", "odebrání pokoje")
                  : null,
              ]
                .filter(Boolean)
                .join(", ")}
        </p>
      </CardContent>
    </Card>
  )
}

function ChangeBadge({ person }: { person: ProposalPerson }) {
  if (person.change === "new") return <Badge variant="success">Nové umístění</Badge>
  if (person.change === "moved") {
    return <Badge variant="warning">Přesun z {person.savedRoom}</Badge>
  }
  return null
}

function PersonName({ person }: { person: ProposalPerson }) {
  return (
    <span className="inline-flex items-center gap-1">
      {person.isLocked ? (
        <Lock
          className="size-3.5 shrink-0"
          aria-label="Zamčené umístění"
        />
      ) : null}
      {person.name}
    </span>
  )
}

const WARNING_TEXT = {
  mixed: "Zamčení účastníci patří do různých skupin. Návrh pokoj ponechá a nikoho nepřidá.",
  overCapacity: "Zamčených osob je víc než lůžek. Návrh pokoj ponechá a nikoho nepřidá.",
}

function ValueBadge({ attribute, value }: { attribute: string | null; value: string | null }) {
  if (!attribute) return null
  return (
    <Badge variant="outline">
      {value === null ? "Bez určující hodnoty" : valueLabel(attribute, value)}
    </Badge>
  )
}

function RoomsTable({
  layout,
  hardAttribute,
}: {
  layout: RoomProposalLayout
  hardAttribute: string | null
}) {
  return (
    <Card padding="none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pokoj</TableHead>
            <TableHead className="text-right">Obsazeno</TableHead>
            <TableHead>Účastníci</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {layout.rooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell className="align-top whitespace-normal">{room.label}</TableCell>
              <TableCell className="text-right align-top">
                <span className="font-mono tabular-nums">
                  {room.people.length} / {room.beds}
                  {room.extraBeds > 0 ? ` + ${room.extraBeds}` : ""}
                </span>
              </TableCell>
              <TableCell className="whitespace-normal">
                {room.people.length === 0 ? (
                  <span className="text-muted-foreground">Volný</span>
                ) : (
                  <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {room.people.map((person, index) => (
                      <li
                        key={person.id}
                        className="inline-flex max-w-full items-center gap-1 whitespace-nowrap"
                      >
                        <PersonName person={person} />
                        <ValueBadge
                          attribute={hardAttribute}
                          value={person.value}
                        />
                        <ChangeBadge person={person} />
                        {index < room.people.length - 1 ? <span aria-hidden="true">,</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
                {room.warning ? (
                  <p className="mt-1 text-sm text-muted-foreground">{WARNING_TEXT[room.warning]}</p>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function UnplacedTable({
  layout,
  attribute,
  hardAttribute,
}: {
  layout: RoomProposalLayout
  attribute?: string | null
  hardAttribute: string | null
}) {
  return (
    <section
      aria-labelledby="room-proposal-unplaced-heading"
      className="space-y-2"
    >
      <h3
        id="room-proposal-unplaced-heading"
        className="text-sm font-medium"
      >
        Bez pokoje v návrhu
      </h3>
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Účastník</TableHead>
              <TableHead>Důvod</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {layout.unplaced.map((person) => (
              <TableRow key={person.id}>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap items-center gap-2">
                    <PersonName person={person} />
                    <ValueBadge
                      attribute={hardAttribute}
                      value={person.value}
                    />
                    {person.change === "removed" ? (
                      <Badge variant="destructive-subtle">Přijde o pokoj {person.savedRoom}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {unplacedReasonText(person.reason, attribute)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}

// Spec §6: listed apart from the unplaced; applying a proposal never changes the lock.
function LockConflicts({
  layout,
  hardAttribute,
}: {
  layout: RoomProposalLayout
  hardAttribute: string | null
}) {
  return (
    <section
      aria-labelledby="room-proposal-conflicts-heading"
      className="space-y-2"
    >
      <h3
        id="room-proposal-conflicts-heading"
        className="text-sm font-medium"
      >
        Konflikty zámků
      </h3>
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Účastník</TableHead>
              <TableHead>Konflikt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {layout.lockConflicts.map((conflict) => (
              <TableRow key={conflict.id}>
                <TableCell className="whitespace-normal">
                  <span className="inline-flex items-center gap-1">
                    <Lock
                      className="size-3.5 shrink-0"
                      aria-label="Zamčené umístění"
                    />
                    {conflict.name}
                    <ValueBadge
                      attribute={hardAttribute}
                      value={conflict.value}
                    />
                  </span>
                </TableCell>
                <TableCell className="whitespace-normal">
                  Zámek do nedostupného pokoje {conflict.room}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}

function StatusNotice({
  status,
  mode,
  hasLayout,
  isShownStale,
}: Pick<RoomProposalProps, "status" | "mode" | "isShownStale"> & { hasLayout: boolean }) {
  switch (status) {
    case "applied":
      return (
        <Notice
          tone="success"
          title="Návrh je použitý"
        >
          {mode === "automatic"
            ? "Uložené rozdělení odpovídá tomuto návrhu. Automatický návrh se za chvíli spustí znovu a může navrhnout další úpravy."
            : "Uložené rozdělení odpovídá tomuto návrhu. Po další změně podkladů bude neaktuální."}
        </Notice>
      )
    case "stale":
      return (
        <Notice
          tone="warning"
          title="Podklady se od návrhu změnily"
        >
          {mode === "automatic"
            ? "Nový návrh vznikne automaticky; můžete ho vytvořit hned tlačítkem Navrhnout pokoje."
            : "Vytvořte nový návrh tlačítkem Navrhnout pokoje."}
        </Notice>
      )
    case "failed":
    case "timeout":
      // "Navrhnout pokoje" above is the retry.
      return (
        <Notice
          tone="error"
          title={
            status === "failed"
              ? "Návrh pokojů se nezdařil. Zkuste to znovu tlačítkem Navrhnout pokoje."
              : "Návrh pokojů nedoběhl v časovém limitu. Zkuste to znovu tlačítkem Navrhnout pokoje."
          }
        >
          {hasLayout
            ? isShownStale
              ? "Níže je poslední dokončený návrh; podklady se od něj změnily."
              : "Níže je poslední dokončený návrh."
            : null}
        </Notice>
      )
    case "none":
      return (
        <Notice
          tone="info"
          title="Termín zatím nemá návrh pokojů"
        >
          {mode === "automatic"
            ? "Návrh vznikne automaticky po změně podkladů; můžete ho vytvořit hned tlačítkem Navrhnout pokoje."
            : "Vytvořte návrh tlačítkem Navrhnout pokoje."}
        </Notice>
      )
    default:
      return null
  }
}

// Správa akce → Ubytování → vybraný termín (#385, phase-2 spec §6–7): the room
// proposal of one term, kept apart from the saved placements: who goes to
// which room, who has no room and why, and what would change. Proposing never
// changes a saved placement or a participation. Design only: every value is
// passed in.
export function RoomProposal({
  terms,
  selectedTermId,
  mode,
  status,
  layout,
  proposedAt,
  isShownStale = false,
  hasApplyAction = false,
  attribute,
  proposalHardAttribute = null,
  isLoadFailed = false,
  isLoading = false,
  isSwitching = false,
  onPropose,
  applyAction,
  proposeError,
  onRetryLoad,
}: RoomProposalProps) {
  const selectedTerm = terms.find((term) => term.id === selectedTermId)
  const isRunning = status === "running"
  const badge = PROPOSAL_STATUS_BADGE[status]
  const shownHardAttribute = layout ? proposalHardAttribute : null
  const shownAttributeLabel = layout
    ? shownHardAttribute
      ? attributeLabel(shownHardAttribute)
      : null
    : attribute

  const content = (
    <>
      {isLoadFailed ? (
        <LoadError
          title="Návrh pokojů se nepodařilo načíst"
          onRetry={onRetryLoad}
        />
      ) : isLoading ? (
        <LoadingBlock
          label="Načítání návrhu pokojů"
          className="mt-2"
        >
          <Skeleton className="h-96 w-full" />
        </LoadingBlock>
      ) : (
        <div
          className="mt-2 space-y-6"
          inert={isSwitching}
          aria-busy={isSwitching}
        >
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {selectedTerm?.label}, {selectedTerm?.dates}
                    </p>
                    {status === "none" ? null : (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {proposedAt ? `Návrh z ${proposedAt} · ` : ""}
                    {mode === "automatic"
                      ? "Automatický návrh zapnutý"
                      : "Automatický návrh vypnutý"}
                  </p>
                  {layout ? (
                    <p className="text-sm text-muted-foreground">
                      {shownHardAttribute
                        ? `Rozdělení podle ${attributeLabel(shownHardAttribute).toLocaleLowerCase("cs")}`
                        : "Bez tvrdého pravidla"}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <PendingButton
                    variant={hasApplyAction && !isRunning ? "outline" : "default"}
                    isPending={isRunning}
                    icon={<Sparkles />}
                    onClick={onPropose}
                  >
                    {isRunning ? "Navrhuje se…" : "Navrhnout pokoje"}
                  </PendingButton>
                  {applyAction}
                </div>
              </div>
            </CardContent>
          </Card>

          {proposeError ? (
            <FormError
              title="Návrh pokojů se nepodařilo spustit"
              message={proposeError}
            />
          ) : null}

          <StatusNotice
            status={status}
            mode={mode}
            hasLayout={layout !== undefined}
            isShownStale={isShownStale}
          />

          {layout ? (
            layout.isEmpty ? (
              <EmptyState
                icon={Users}
                title="V termínu nejsou potvrzení účastníci"
              />
            ) : layout.rooms.length === 0 ? (
              // Everyone has the reason N: one message instead of a row each.
              <>
                <EmptyState
                  icon={BedDouble}
                  title="Termín nemá dostupný pokoj"
                />
                {layout.lockConflicts.length > 0 ? (
                  <LockConflicts
                    layout={layout}
                    hardAttribute={shownHardAttribute}
                  />
                ) : null}
              </>
            ) : (
              <>
                {!layout.isComplete ? (
                  <Notice
                    tone="warning"
                    title="Rozdělení nemusí být nejlepší možné"
                  >
                    Výpočet nestihl v časovém limitu prověřit všechny možnosti; rozdělení dodržuje
                    všechna pravidla.
                  </Notice>
                ) : null}
                <Summary layout={layout} />
                <RoomsTable
                  layout={layout}
                  hardAttribute={shownHardAttribute}
                />
                {layout.unplaced.length > 0 ? (
                  <UnplacedTable
                    layout={layout}
                    attribute={shownAttributeLabel}
                    hardAttribute={shownHardAttribute}
                  />
                ) : null}
                {layout.lockConflicts.length > 0 ? (
                  <LockConflicts
                    layout={layout}
                    hardAttribute={shownHardAttribute}
                  />
                ) : null}
              </>
            )
          ) : null}
        </div>
      )}
    </>
  )

  return <RoomProposalFrame>{content}</RoomProposalFrame>
}

export function RoomProposalFrame({ children }: { children: ReactNode }) {
  return (
    <PageSection
      title="Návrh pokojů"
      headingId="room-proposal-heading"
    >
      {children}
    </PageSection>
  )
}
