import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { ForParticipantsPage } from "@/features/landing/components/ForParticipantsPage"

// Public presentation page for participants (F58/F59); static, no loader.
export const Route = createFileRoute("/for-participants")({ component: ForParticipantsRoute })

function ForParticipantsRoute() {
  return (
    <>
      <Seo title="Pro účastníky" />
      <ForParticipantsPage />
    </>
  )
}
