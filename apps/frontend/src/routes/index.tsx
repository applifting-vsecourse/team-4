import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { useSession } from "@/features/auth/hooks/useSession"
import { LandingPage } from "@/features/landing/components/LandingPage"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  const { user } = useSession()
  return (
    <>
      <Seo />
      <LandingPage isSignedIn={Boolean(user)} />
    </>
  )
}
