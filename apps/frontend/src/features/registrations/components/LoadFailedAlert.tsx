import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatPragueDateTime } from "@/lib/date"

type LoadFailedAlertProps = {
  /** When the data still shown were last read; absent when nothing was ever loaded. */
  shownFrom?: number
  isRetrying: boolean
  onRetry: () => unknown
}

// A failed load or refresh. Data that are still shown are said to be old, and
// a failed first load is never turned into an empty state.
export function LoadFailedAlert({ shownFrom, isRetrying, onRetry }: LoadFailedAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Data se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
      <AlertDescription>
        {shownFrom ? (
          <p>
            Zobrazené údaje jsou z posledního úspěšného načtení (
            {formatPragueDateTime(new Date(shownFrom).toISOString())}).
          </p>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => onRetry()}
          disabled={isRetrying}
        >
          Zkusit znovu
        </Button>
      </AlertDescription>
    </Alert>
  )
}
