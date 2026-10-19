import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { LandingPage } from "@/features/landing/components/LandingPage"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return (
    <>
      <Seo />
      <LandingPage />
    </>
  )
}
