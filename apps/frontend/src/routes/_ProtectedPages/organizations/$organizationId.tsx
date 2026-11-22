import { createFileRoute, Outlet } from "@tanstack/react-router"

import { OrganizationWorkspaceLayout } from "@/routes/_ProtectedPages/-OrganizationWorkspaceLayout"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { organizationsQueryOptions } from "@/features/organizations/api/organizationQueryOptions"
import { rememberOrganization } from "@/features/organizations/lib/lastOrganization"

// Shell of every page of one organization: sidebar + workspace. On a phone the sidebar opens as a sheet.
export const Route = createFileRoute("/_ProtectedPages/organizations/$organizationId")({
  loader: async ({ context, params, preload: isPreload }) => {
    const [organizations, session] = await Promise.all([
      context.queryClient.ensureQueryData(organizationsQueryOptions()),
      context.queryClient.ensureQueryData(authSessionQueryOptions()),
    ])
    // The fallback of "Zpět na přehled akcí" (S2-03). A link preloaded on
    // hover is not a visit, and a foreign organization is never remembered.
    const isOwn = organizations.some((organization) => organization.id === params.organizationId)
    if (!isPreload && session && isOwn) rememberOrganization(session.user.id, params.organizationId)
  },
  component: OrganizationShell,
})

function OrganizationShell() {
  const { organizationId } = Route.useParams()

  return (
    <OrganizationWorkspaceLayout organizationId={organizationId}>
      <Outlet />
    </OrganizationWorkspaceLayout>
  )
}
