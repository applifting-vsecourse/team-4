import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"

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
  return (
    <>
      <Seo />
      <Header userMenu={<HeaderMenu />} />
      <main className="min-h-svh">
        <Outlet />
      </main>
    </>
  )
}
