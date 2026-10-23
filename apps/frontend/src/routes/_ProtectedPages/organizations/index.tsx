import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { ArrowUpRight, Building2, Plus } from "lucide-react"

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
          <PageHeader
            title="Vyberte organizaci"
            description="Otevřete seznam akcí organizace, kterou chcete spravovat."
            actions={
              <Button asChild>
                <Link to={ROUTES.newOrganization}>
                  <Plus aria-hidden="true" />
                  Založit organizaci
                </Link>
              </Button>
            }
          />
          <ul
            aria-label="Vaše organizace"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {organizations.map((organization) => (
              <li
                key={organization.id}
                className="flex"
              >
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="group h-auto min-h-40 w-full flex-col text-left whitespace-normal"
                >
                  <Link
                    to={ROUTES.organization}
                    params={{ organizationId: organization.id }}
                  >
                    <span className="flex min-h-28 w-full flex-col justify-between gap-6">
                      <span className="flex w-full items-start justify-between gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Building2
                            aria-hidden="true"
                            className="size-6 text-muted-foreground"
                          />
                        </span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                        />
                      </span>
                      <span className="w-full min-w-0 space-y-1">
                        <span className="block text-base font-semibold break-words">
                          {organization.name}
                        </span>
                        <span className="block text-sm font-normal text-muted-foreground">
                          Otevřít seznam akcí
                        </span>
                      </span>
                    </span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
