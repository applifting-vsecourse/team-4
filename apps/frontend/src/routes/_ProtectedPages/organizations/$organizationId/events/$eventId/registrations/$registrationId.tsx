import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { eventQueryOptions } from "@/features/events/api/eventQueryOptions"
import { EventBreadcrumb } from "@/features/events/components/EventBreadcrumb"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { eventRegistrationQueryOptions } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { RegistrationDetail } from "@/features/registrations/components/RegistrationDetail"

// Správa akce → Přihlášky → Detail účastníka (S2-11): the organizer's view of
// one registration, not the participant's account.
export const Route = createFileRoute(
  "/_ProtectedPages/organizations/$organizationId/events/$eventId/registrations/$registrationId",
)({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
      context.queryClient.ensureQueryData(eventQueryOptions(params.organizationId, params.eventId)),
      context.queryClient.ensureQueryData(
        eventRegistrationQueryOptions(params.organizationId, params.eventId, params.registrationId),
      ),
    ]),
  component: RegistrationPage,
  errorComponent: LoadError,
})

function RegistrationPage() {
  const { organizationId, eventId, registrationId } = Route.useParams()
  const { data: organization } = useSuspenseQuery(organizationQueryOptions(organizationId))
  const { data: event } = useSuspenseQuery(eventQueryOptions(organizationId, eventId))
  const registration = useSuspenseQuery(
    eventRegistrationQueryOptions(organizationId, eventId, registrationId),
  )
  const name = `${registration.data.firstName} ${registration.data.lastName}`

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
      <Seo title={`${name} – ${event.name}`} />
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization.name}
            event={event}
            current="Přihlášky"
          />
        }
        title={name}
        description={event.name}
        actions={
          <Button
            asChild
            variant="ghost"
          >
            <Link
              to={ROUTES.eventRegistrations}
              params={{ organizationId, eventId }}
            >
              <ArrowLeft />
              Zpět na přihlášky
            </Link>
          </Button>
        }
      />
      <RegistrationDetail
        registration={registration.data}
        updatedAt={registration.dataUpdatedAt}
        isRefreshing={registration.isFetching}
        hasRefreshFailed={registration.isRefetchError}
        onRefresh={() => registration.refetch()}
      />
    </section>
  )
}

// A registration of another event or organization looks like a missing one
// (S2-03); any other failure can be retried and is never shown as data.
function LoadError({ error, reset }: ErrorComponentProps) {
  const { organizationId, eventId } = Route.useParams()
  const router = useRouter()
  const { data: organization } = useQuery(organizationQueryOptions(organizationId))
  const isGone = error instanceof HTTPError && [403, 404].includes(error.response.status)

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
      <PageHeader
        breadcrumb={
          <EventBreadcrumb
            organizationId={organizationId}
            organizationName={organization?.name}
          />
        }
        title="Přihláška"
      />
      {isGone ? (
        <RecordUnavailable
          action={
            <Button asChild>
              <Link
                to={ROUTES.organization}
                params={{ organizationId }}
              >
                Zpět na přehled akcí
              </Link>
            </Button>
          }
        />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Data se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reset()
                  void router.invalidate()
                }}
              >
                Zkusit znovu
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
              >
                <Link
                  to={ROUTES.eventRegistrations}
                  params={{ organizationId, eventId }}
                >
                  Zpět na přihlášky
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </section>
  )
}
