import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { ForOrganizersPage } from "@/features/landing/components/ForOrganizersPage"

// Public presentation page for organizers (F58/F59); static, no loader.
export const Route = createFileRoute("/for-organizers")({ component: ForOrganizersRoute })

function ForOrganizersRoute() {
  return (
    <>
      <Seo title="Pro organizátory" />
      <ForOrganizersPage />
    </>
  )
}
