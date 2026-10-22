import { useState } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Card, CardContent } from "@/components/ui/card"
import { readApiError } from "@/lib/apiError"

import { useSession } from "@/features/auth/hooks/useSession"
import { type EventInput } from "@/features/events/api/eventSchemas"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { EventForm } from "@/features/events/components/EventForm"
import { useCreateEvent } from "@/features/events/hooks/useEventMutations"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"

// Wireframy E1, E2.
export const Route = createFileRoute("/_ProtectedPages/organizations/$organizationId/events/new")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
  component: NewEventPage,
  errorComponent: Unavailable,
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
      const apiError = readApiError(error)
      setErrorMessage(
        apiError.status === 400 && apiError.message
          ? apiError.message
          : "Akci se nepodařilo vytvořit. Zkuste to prosím znovu.",
      )
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-8 md:py-12">
      <Seo title="Nová akce" />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            current="Nová akce"
          />
        }
        title="Nová akce"
        description="Termíny přidáte po uložení akce."
      />
      <Card>
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

function Unavailable() {
  const { organizationId } = Route.useParams()
  const { user } = useSession()
  return (
    <section className="mx-auto w-full max-w-xl px-4 py-8 md:py-12">
      <PageHeader title="Nová akce" />
      <RecordUnavailable
        action={
          <BackToEventsButton
            organizationId={organizationId}
            userId={user?.id}
          />
        }
      />
    </section>
  )
}
