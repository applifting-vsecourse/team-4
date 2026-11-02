import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// F65: a failed load of a programme; never shown as an empty programme.
export function ProgrammeLoadFailed() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Program se nepodařilo načíst.</AlertTitle>
      <AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
        >
          Zkusit znovu
        </Button>
      </AlertDescription>
    </Alert>
  )
}
