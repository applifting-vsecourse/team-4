import { createFileRoute, Link, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageHeader } from "@/components/PageHeader"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { organizationsQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { NoOrganizations } from "@/features/organizations/components/NoOrganizations"

export const Route = createFileRoute("/_ProtectedPages/organizations/")({
  loader: async ({ context }) => {
    const organizations = await context.queryClient.fetchQuery({
      ...organizationsQueryOptions(),
      staleTime: 0,
    })
    const organization = organizations.length === 1 ? organizations[0] : undefined
    if (organization) {
      throw redirect({
        to: ROUTES.organization,
        params: { organizationId: organization.id },
        replace: true,
      })
    }
    return organizations
  },
  component: OrganizationsPage,
})

function OrganizationsPage() {
  const organizations = Route.useLoaderData()
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12">
      <Seo title="Organizace" />
      {organizations.length === 0 ? (
        <NoOrganizations />
      ) : (
        <>
          <PageHeader title="Vyberte organizaci" />
          <ul className="space-y-2">
            {organizations.map((organization) => (
              <li key={organization.id}>
                <Button
                  asChild
                  variant="outline"
                  className="h-auto w-full justify-start text-left whitespace-normal"
                >
                  <Link
                    to={ROUTES.organization}
                    params={{ organizationId: organization.id }}
                  >
                    {organization.name}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
          <Button
            asChild
            variant="outline"
            className="mt-6"
          >
            <Link to={ROUTES.newOrganization}>Založit organizaci</Link>
          </Button>
        </>
      )}
    </section>
  )
}
