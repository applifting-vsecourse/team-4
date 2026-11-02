import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type ProgrammeLoadFailedProps = {
  onRetry?: () => void
  isRetrying?: boolean
}

// F65: a failed load of a programme; never shown as an empty programme.
export function ProgrammeLoadFailed({ onRetry, isRetrying = false }: ProgrammeLoadFailedProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Program se nepodařilo načíst.</AlertTitle>
      <AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={isRetrying}
          onClick={onRetry}
        >
          Zkusit znovu
        </Button>
      </AlertDescription>
    </Alert>
  )
}
