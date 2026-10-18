import { createFileRoute, notFound } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { DesignSystemPage } from "@/features/design-system/components/DesignSystemPage"

export const Route = createFileRoute("/design-system")({
  // Development preview only; production builds answer with 404.
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: DesignSystemRoute,
})

function DesignSystemRoute() {
  return (
    <>
      <Seo title="Design system" />
      <DesignSystemPage />
    </>
  )
}
