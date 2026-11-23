import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { ForOrganizersPage } from "@/features/landing/components/ForOrganizersPage"
import { ParticipantAwareHeader } from "@/features/participant-access/components/ParticipantAwareHeader"

// Public presentation page for organizers (F58/F59); static, no loader.
export const Route = createFileRoute("/for-organizers")({ component: ForOrganizersRoute })

function ForOrganizersRoute() {
  return (
    <>
      <Seo title="Pro organizátory" />
      <ForOrganizersPage header={<ParticipantAwareHeader />} />
    </>
  )
}
