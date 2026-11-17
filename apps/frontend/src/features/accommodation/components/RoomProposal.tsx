import type { ReactNode } from "react"
import { BedDouble, Lock, Sparkles, Users } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { FormError } from "@/components/FormError"
import { HorizontalOverflowViewport } from "@/components/HorizontalOverflowViewport"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { RoomProposalStatus } from "@/features/accommodation/api/roomProposalSchemas"
import type { EvaluationTerm } from "@/features/accommodation/components/TermEvaluation"
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
  /** The term could not be loaded; nothing else is shown as valid. */
  isLoadFailed?: boolean
  /** The term is loading: the term tabs stay, the content is a placeholder. */
  isLoading?: boolean
  /** Another term is loading: the previous one stays shown but inert. */
  isSwitching?: boolean
  onSelectTerm?: (termId: string) => void
  onPropose?: () => void
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
            value={summary.unplaced + summary.lockConflicts}
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

function RoomsTable({ layout }: { layout: RoomProposalLayout }) {
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
                  <ul className="space-y-1">
                    {room.people.map((person) => (
                      <li
                        key={person.id}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <PersonName person={person} />
                        <ChangeBadge person={person} />
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

function UnplacedTable({ layout }: { layout: RoomProposalLayout }) {
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
            {layout.lockConflicts.map((conflict) => (
              <TableRow key={conflict.id}>
                <TableCell className="whitespace-normal">
                  <span className="inline-flex items-center gap-1">
                    <Lock
                      className="size-3.5 shrink-0"
                      aria-label="Zamčené umístění"
                    />
                    {conflict.name}
                  </span>
                </TableCell>
                <TableCell className="whitespace-normal">
                  Zámek do pokoje {conflict.room}, který v termínu není dostupný. Umístění zůstane,
                  dokud zámek nezměníte.
                </TableCell>
              </TableRow>
            ))}
            {layout.unplaced.map((person) => (
              <TableRow key={person.id}>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap items-center gap-2">
                    <PersonName person={person} />
                    {person.change === "removed" ? (
                      <Badge variant="destructive-subtle">Přijde o pokoj {person.savedRoom}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {unplacedReasonText(person.reason)}
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
  onPropose,
}: Pick<RoomProposalProps, "status" | "mode" | "onPropose"> & { hasLayout: boolean }) {
  switch (status) {
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
      return (
        <LoadError
          title={
            status === "failed"
              ? "Návrh pokojů se nezdařil"
              : "Návrh pokojů nedoběhl v časovém limitu"
          }
          description={hasLayout ? "Níže je poslední dokončený návrh." : undefined}
          onRetry={onPropose}
        />
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
  isLoadFailed = false,
  isLoading = false,
  isSwitching = false,
  onSelectTerm,
  onPropose,
  proposeError,
  onRetryLoad,
}: RoomProposalProps) {
  const selectedTerm = terms.find((term) => term.id === selectedTermId)
  const isRunning = status === "running"
  const badge = PROPOSAL_STATUS_BADGE[status]

  return (
    <RoomProposalFrame>
      <Tabs
        value={selectedTermId}
        onValueChange={onSelectTerm}
      >
        <HorizontalOverflowViewport>
          <TabsList
            aria-label="Termín"
            className="w-max min-w-full"
          >
            {terms.map((term) => (
              <TabsTrigger
                key={term.id}
                value={term.id}
              >
                {term.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </HorizontalOverflowViewport>

        <TabsContent value={selectedTermId}>
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
                        {mode === "automatic" ? "Navrhuje se automaticky" : "Navrhuje se ručně"}
                      </p>
                    </div>
                    <PendingButton
                      variant="outline"
                      isPending={isRunning}
                      icon={<Sparkles />}
                      onClick={onPropose}
                    >
                      {isRunning ? "Navrhuje se…" : "Navrhnout pokoje"}
                    </PendingButton>
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
                onPropose={onPropose}
              />

              {layout ? (
                layout.isEmpty ? (
                  <EmptyState
                    icon={Users}
                    title="V termínu zatím nejsou potvrzení účastníci"
                    description="Návrh rozděluje do pokojů jen potvrzené účastníky."
                  />
                ) : layout.rooms.length === 0 ? (
                  <>
                    <EmptyState
                      icon={BedDouble}
                      title="Termín nemá dostupný pokoj"
                    />
                    <UnplacedTable layout={layout} />
                  </>
                ) : (
                  <>
                    {!layout.isComplete ? (
                      <Notice
                        tone="warning"
                        title="Rozdělení nemusí být nejlepší možné"
                      >
                        Výpočet nestihl v časovém limitu prověřit všechny možnosti; rozdělení
                        dodržuje všechna pravidla.
                      </Notice>
                    ) : null}
                    <Summary layout={layout} />
                    <RoomsTable layout={layout} />
                    {layout.unplaced.length + layout.lockConflicts.length > 0 ? (
                      <UnplacedTable layout={layout} />
                    ) : null}
                  </>
                )
              ) : null}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </RoomProposalFrame>
  )
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
