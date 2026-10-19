import { useState } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Card, CardContent } from "@/components/ui/card"

import { type EventInput } from "@/features/events/api/eventSchemas"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventForm } from "@/features/events/components/EventForm"
import { useCreateEvent } from "@/features/events/hooks/useEventMutations"
import { readApiError } from "@/features/events/lib/apiError"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { OrganizationUnavailable } from "@/features/organizations/components/OrganizationUnavailable"

export const Route = createFileRoute("/_ProtectedPages/organizations/$organizationId/events/new")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
  component: NewEventPage,
  errorComponent: OrganizationUnavailable,
})

function NewEventPage() {
  const { organizationId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const navigate = useNavigate()
  const createEvent = useCreateEvent(organizationId)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (values: EventInput) => {
    setErrorMessage(null)
    try {
      const event = await createEvent.mutateAsync(values)
      await navigate({ to: ROUTES.event, params: { organizationId, eventId: event.id } })
    } catch (error) {
      const apiError = await readApiError(error)
      setErrorMessage(
        apiError.status === 400 && apiError.message
          ? apiError.message
          : "Akci se nepodařilo vytvořit. Zkuste to prosím znovu.",
      )
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-12">
      <Seo title="Nová akce" />
      <EventBreadcrumb
        organizationId={organizationId}
        organizationName={organization.name}
        current="Nová akce"
      />
      <h1 className="text-h2">Nová akce</h1>
      <p className="mt-2 text-sm text-muted-foreground">Termíny přidáte po uložení akce.</p>
      <Card className="mt-6">
        <CardContent>
          <EventForm
            submitLabel="Vytvořit akci"
            isLoading={createEvent.isPending}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
            onCancel={() => navigate({ to: ROUTES.organization, params: { organizationId } })}
          />
        </CardContent>
      </Card>
    </section>
  )
}
