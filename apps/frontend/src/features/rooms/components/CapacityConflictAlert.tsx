import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export type CapacityConflict = {
  termLabel: string
  dates: string
  proposedCapacity: number
  confirmed: number
}

// A change that would drop a term below its confirmed participants is not
// saved (F11-1). Design only: the conflicts are passed in ready to show.
export function CapacityConflictAlert({ conflicts }: { conflicts: CapacityConflict[] }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Změnu nelze uložit</AlertTitle>
      <AlertDescription>
        <p>
          Kapacita by klesla pod počet potvrzených účastníků. Původní nastavení zůstává beze změny.
        </p>
        <ul className="mt-2 space-y-1">
          {conflicts.map((conflict) => (
            <li key={conflict.termLabel}>
              <span className="font-medium">{conflict.termLabel}</span> ({conflict.dates}):
              navrhovaná kapacita {conflict.proposedCapacity}, potvrzení {conflict.confirmed}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
