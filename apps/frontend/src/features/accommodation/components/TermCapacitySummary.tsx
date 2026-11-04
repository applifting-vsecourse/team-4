import { Alert, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

/** What the proposal of the term decided; counts are the solver's, never a bed sum. */
export type CapacityProposal = {
  suitable: number
  /** Reasons A, B, C and N. */
  unsuitable: number
  /** Reason R. */
  manual: number
  /** Beds the confirmed and the suitable take by the proposal (solver `beds`). */
  baseUsed: number
  extraUsed: number
}

export type TermCapacity = {
  confirmed: number
  pending: number
  waitlisted: number
  /** The event has rooms at all; without them no capacity is recorded. */
  hasRooms: boolean
  /** Of the rooms available in the term (F11-1). */
  baseBeds: number
  extraBeds: number
  /** Missing without a valid proposal (conflict, never evaluated). */
  proposal?: CapacityProposal
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-h3">{value}</dd>
    </div>
  )
}

function BedUse({ label, used, total }: { label: string; used: number; total: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {used} / {total}
        </span>
      </div>
      <Progress
        value={total === 0 ? 0 : (used / total) * 100}
        aria-label={`${label}: ${used} z ${total}`}
      />
    </div>
  )
}

// One term's participation, capacity and proposal (F17-1) in the term
// evaluation; Ubytování → Obsazenost shows the same numbers per term. Design
// only: every value is passed in.
export function TermCapacitySummary({ term }: { term: TermCapacity }) {
  const capacity = term.baseBeds + term.extraBeds

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Účast</h3>
        <dl className="grid grid-cols-3 gap-3 md:grid-cols-1">
          <Stat
            label="Potvrzení"
            value={term.confirmed}
          />
          <Stat
            label="Čekají na rozhodnutí"
            value={term.pending}
          />
          <Stat
            label="Náhradníci"
            value={term.waitlisted}
          />
        </dl>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Kapacita</h3>
        {term.hasRooms ? (
          <dl className="grid grid-cols-3 gap-3 md:grid-cols-1">
            <Stat
              label="Celkem"
              value={capacity}
            />
            <Stat
              label="Lůžka"
              value={term.baseBeds}
            />
            <Stat
              label="Přistýlky"
              value={term.extraBeds}
            />
          </dl>
        ) : (
          <Alert>
            <AlertTitle>Ubytovací kapacita není evidovaná</AlertTitle>
          </Alert>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Podle návrhu</h3>
        {term.proposal ? (
          <>
            <dl className="grid grid-cols-3 gap-3">
              <Stat
                label="Vhodní"
                value={term.proposal.suitable}
              />
              <Stat
                label="Neubytovatelní"
                value={term.proposal.unsuitable}
              />
              <Stat
                label="Ruční určení"
                value={term.proposal.manual}
              />
            </dl>
            {capacity > 0 ? (
              <div className="space-y-3">
                <BedUse
                  label="Obsazená lůžka"
                  used={term.proposal.baseUsed}
                  total={term.baseBeds}
                />
                <BedUse
                  label="Obsazené přistýlky"
                  used={term.proposal.extraUsed}
                  total={term.extraBeds}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Bez platného návrhu</p>
        )}
      </div>
    </div>
  )
}
