import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { LandingPage } from "@/features/landing/components/LandingPage"
import { CatalogPreview } from "@/features/public-events/components/CatalogPreview"

// No loader: the catalog preview loads inside the page, so an empty or failing
// catalog never holds up the landing page (F58).
export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return (
    <>
      <Seo />
      <LandingPage catalogPreview={<CatalogPreview />} />
    </>
  )
}
