import type { ReactNode } from "react"

import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"

type EventLoadErrorProps = {
  organizationId: string
  organizationName?: string
  error: unknown
  onRetry: () => void
  /** The way out of "Záznam není dostupný", to an own organization's events. */
  backAction: ReactNode
}

// A foreign and a missing event look the same (S2-03). Any other
// failure is a failed load that can be retried, never an event without terms (S2-17).
export function EventLoadError({
  organizationId,
  organizationName,
  error,
  onRetry,
  backAction,
}: EventLoadErrorProps) {
  const isGone = error instanceof HTTPError && [403, 404].includes(error.response.status)

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organizationName}
          />
        }
        title="Akce a turnusy"
      />
      {isGone ? (
        <RecordUnavailable action={backAction} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
          <AlertDescription>
            <p>Zkontrolujte připojení a zkuste to znovu.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onRetry}
            >
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </section>
  )
}
