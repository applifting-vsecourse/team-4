import { useEffect } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { useSession } from "@/features/auth/hooks/useSession"
import { organizationQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { EventsEmptyState } from "@/features/organizations/components/EventsEmptyState"
import { rememberOrganization } from "@/features/organizations/lib/lastOrganization"

// Events list of one own organization (the events themselves arrive with S2-04).
export const Route = createFileRoute("/_ProtectedPages/organizations/$organizationId/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(organizationQueryOptions(params.organizationId)),
  component: OrganizationEventsPage,
  // A foreign and a missing organization look the same (S2-03).
  errorComponent: OrganizationUnavailable,
})

function OrganizationEventsPage() {
  const organization = Route.useLoaderData()
  const { user } = useSession()

  useEffect(() => {
    if (user) rememberOrganization(user.id, organization.id)
  }, [user, organization.id])

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12">
      <Seo title={organization.name} />
      <p className="text-sm text-muted-foreground">Organizace</p>
      <h1 className="text-h2">{organization.name}</h1>
      <h2 className="mt-8 mb-4 text-h4">Akce</h2>
      <EventsEmptyState />
    </section>
  )
}

function OrganizationUnavailable() {
  return (
    <section className="mx-auto w-full max-w-sm px-4 py-16">
      <Alert variant="destructive">
        <AlertTitle>Záznam není dostupný</AlertTitle>
        <AlertDescription>Tato organizace neexistuje, nebo k ní nemáte přístup.</AlertDescription>
      </Alert>
      <Button
        asChild
        variant="outline"
        className="mt-4"
      >
        <Link to={ROUTES.organizations}>Zpět na moje organizace</Link>
      </Button>
    </section>
  )
}
