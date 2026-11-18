import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { participantSessionQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"
import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { ParticipantProfile } from "@/features/participant-access/components/ParticipantProfile"
import { ParticipantSessionEnded } from "@/features/participant-access/components/ParticipantSessionEnded"

// Můj profil from the participant's account menu (S4-08). Bound to the
// verified session; without one the visitor can ask for a new link.
export const Route = createFileRoute("/my-profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantSessionQueryOptions()),
  component: MyProfilePage,
})

function MyProfilePage() {
  const { data: participant } = useSuspenseQuery(participantSessionQueryOptions())

  return (
    <>
      <Seo title="Můj profil" />
      <ParticipantLayout participant={participant}>
        {participant ? (
          <ParticipantProfile sessionEnded={<ParticipantSessionEnded />} />
        ) : (
          <div className="mx-auto w-full max-w-md">
            <MagicLinkRequest />
          </div>
        )}
      </ParticipantLayout>
    </>
  )
}
