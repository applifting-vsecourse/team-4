import { useState } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { type EventInput } from "@/features/events/api/eventSchemas"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventForm } from "@/features/events/components/EventForm"
import { EventLockedAlert } from "@/features/events/components/EventLockedAlert"
import { EventUnavailable } from "@/features/events/components/EventUnavailable"
import { useRefreshEvent, useUpdateEvent } from "@/features/events/hooks/useEventMutations"
import { readApiError } from "@/features/events/lib/apiError"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"

export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/edit",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
    ]),
  component: EditEventPage,
  errorComponent: Unavailable,
})

function EditEventPage() {
  const { organizationId, eventId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const navigate = useNavigate()
  const updateEvent = useUpdateEvent(organizationId, eventId)
  const refreshEvent = useRefreshEvent(organizationId, eventId)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Captured once: a refetch must not overwrite what the organizer is typing.
  const [initialValues] = useState<EventInput>(() => ({
    name: event.name,
    location: event.location,
    description: event.description,
  }))

  const backToEvent = () => navigate({ to: ROUTES.event, params: { organizationId, eventId } })

  const handleSubmit = async (values: EventInput) => {
    setErrorMessage(null)
    try {
      await updateEvent.mutateAsync(values)
      toast.success("Změny akce byly uloženy.")
      await backToEvent()
    } catch (error) {
      const apiError = await readApiError(error)
      if (apiError.code === "event_locked") await refreshEvent()
      setErrorMessage(
        (apiError.status === 400 || apiError.code === "event_locked") && apiError.message
          ? apiError.message
          : "Změny se nepodařilo uložit. Zkuste to prosím znovu.",
      )
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-12">
      <Seo title={`Upravit akci ${event.name}`} />
      <EventBreadcrumb
        organizationId={organizationId}
        organizationName={organization.name}
        event={event}
        current="Upravit akci"
      />
      <h1 className="text-h2">Upravit akci</h1>
      {event.isLocked ? (
        <div className="mt-6 space-y-4">
          <EventLockedAlert status={event.status} />
          <Button
            asChild
            variant="outline"
          >
            <Link
              to={ROUTES.event}
              params={{ organizationId, eventId }}
            >
              Zpět na akci
            </Link>
          </Button>
        </div>
      ) : (
        <Card className="mt-6">
          <CardContent>
            <EventForm
              initialValues={initialValues}
              submitLabel="Uložit změny"
              isLoading={updateEvent.isPending}
              errorMessage={errorMessage}
              onSubmit={handleSubmit}
              onCancel={backToEvent}
            />
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function Unavailable() {
  const { organizationId } = Route.useParams()
  return <EventUnavailable organizationId={organizationId} />
}
