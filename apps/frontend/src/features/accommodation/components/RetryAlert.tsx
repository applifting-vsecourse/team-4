import { CircleAlert } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// A failed load or run with its retry, never shown as empty data. The retry
// sits below the alert: inside a destructive alert the kit's description
// colour does not reach AA contrast.
export function RetryAlert({
  title,
  onRetry,
  isRetrying = false,
}: {
  title: string
  onRetry?: () => void
  isRetrying?: boolean
}) {
  return (
    <div className="space-y-2">
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>{title}</AlertTitle>
      </Alert>
      <Button
        variant="outline"
        size="sm"
        disabled={isRetrying}
        onClick={onRetry}
      >
        Zkusit znovu
      </Button>
    </div>
  )
}
