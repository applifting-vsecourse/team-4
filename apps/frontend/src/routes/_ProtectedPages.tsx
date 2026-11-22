import { createFileRoute, Outlet, redirect, useMatch } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Main } from "@/components/MainLandmark"
import { Seo } from "@/components/Seo"
import { OrganizationWorkspaceLayout } from "@/routes/_ProtectedPages/-OrganizationWorkspaceLayout"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"

export const Route = createFileRoute("/_ProtectedPages")({
  loader: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (session) return
    context.queryClient.clear()
    throw redirect({
      to: ROUTES.login,
      search: { from: encodeRedirectUri(location) },
    })
  },
  component: Layout,
})

function Layout() {
  // Pages of one organization have their own shell with the sidebar.
  const organizationShell = useMatch({
    from: "/_ProtectedPages/organizations/$organizationId",
    shouldThrow: false,
  })
  const organizationCreationShell = useMatch({
    from: "/_ProtectedPages/organizations/new",
    shouldThrow: false,
  })
  const organizationsOverviewShell = useMatch({
    from: "/_ProtectedPages/organizations/",
    shouldThrow: false,
  })

  if (organizationShell) {
    return (
      <>
        <Seo />
        <Outlet />
      </>
    )
  }

  if (organizationCreationShell || organizationsOverviewShell) {
    return (
      <>
        <Seo />
        <OrganizationWorkspaceLayout>
          <Outlet />
        </OrganizationWorkspaceLayout>
      </>
    )
  }

  return (
    <>
      <Seo />
      <Header account={<HeaderMenu />} />
      <Main className="min-h-svh">
        <Outlet />
      </Main>
    </>
  )
}
