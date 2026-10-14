import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  const { user } = useSession()
  return (
    <>
      <Seo title="Home" />
      <Header userMenu={<HeaderMenu />} />
      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to akc.io</h1>
        <p className="mt-3 text-muted-foreground">
          Event management for organizers and participants.
        </p>
        <div className="mt-6 flex gap-3">
          {user ? (
            <Button asChild>
              <Link to={ROUTES.dashboard}>Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to={ROUTES.signup}>Create an account</Link>
              </Button>
              <Button
                asChild
                variant="outline"
              >
                <Link to={ROUTES.login}>Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </>
  )
}
