import { createFileRoute, redirect } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { organizationsQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { NoOrganizations } from "@/features/organizations/components/NoOrganizations"
import {
  pickEntryOrganization,
  recallOrganization,
} from "@/features/organizations/lib/lastOrganization"

// Entry after sign-in: opens the remembered (or first) own organization; an
// account without any shows the empty state.
export const Route = createFileRoute("/_ProtectedPages/organizations/")({
  loader: async ({ context }) => {
    const [session, organizations] = await Promise.all([
      context.queryClient.ensureQueryData(authSessionQueryOptions()),
      context.queryClient.fetchQuery({ ...organizationsQueryOptions(), staleTime: 0 }),
    ])
    const entry = pickEntryOrganization(
      organizations,
      session ? recallOrganization(session.user.id) : null,
    )
    if (entry) {
      throw redirect({
        to: "/organizations/$organizationId",
        params: { organizationId: entry.id },
        replace: true,
      })
    }
  },
  component: OrganizationsPage,
})

function OrganizationsPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12">
      <Seo title="Organizace" />
      <NoOrganizations />
    </section>
  )
}
