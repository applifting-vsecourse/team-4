import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** The terms that would drop below their confirmed participants, e.g. "Turnus 1". */
export const capacityConflictMessage = (terms: string) =>
  `Kapacita by klesla pod počet potvrzených účastníků: ${terms}`

// A change that would drop a term below its confirmed participants is not
// saved (F11-1). Design only: the affected terms are passed in.
export function CapacityConflictAlert({ terms }: { terms: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Změnu nelze uložit</AlertTitle>
      <AlertDescription>{capacityConflictMessage(terms)}</AlertDescription>
    </Alert>
  )
}
