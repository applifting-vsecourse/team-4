import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export type CapacityConflict = {
  termLabel: string
  proposedCapacity: number
  confirmedParticipants: number
}

/** The terms and counts that would make a proposed room change invalid. */
export const capacityConflictMessage = (conflicts: CapacityConflict[]) =>
  `Kapacita by klesla pod počet potvrzených účastníků: ${conflicts
    .map(
      ({ termLabel, proposedCapacity, confirmedParticipants }) =>
        `${termLabel} (nová kapacita ${proposedCapacity}, potvrzeno ${confirmedParticipants})`,
    )
    .join("; ")}`

// A change that would drop a term below its confirmed participants is not
// saved (F11-1). Design only: the affected terms are passed in.
export function CapacityConflictAlert({ conflicts }: { conflicts: CapacityConflict[] }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Změnu nelze uložit</AlertTitle>
      <AlertDescription>{capacityConflictMessage(conflicts)}</AlertDescription>
    </Alert>
  )
}
