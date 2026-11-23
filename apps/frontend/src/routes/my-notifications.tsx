import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { participantSessionQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"
import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { ParticipantNotifications } from "@/features/participant-access/components/ParticipantNotifications"
import { ParticipantSessionEnded } from "@/features/participant-access/components/ParticipantSessionEnded"

// Oznámení from the participant's account menu (S4-06). Bound to the verified
// session; without one the visitor can ask for a new link.
export const Route = createFileRoute("/my-notifications")({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantSessionQueryOptions()),
  component: MyNotificationsPage,
})

function MyNotificationsPage() {
  const { data: participant } = useSuspenseQuery(participantSessionQueryOptions())

  return (
    <>
      <Seo title="Oznámení" />
      <ParticipantLayout>
        {participant ? (
          <ParticipantNotifications sessionEnded={<ParticipantSessionEnded />} />
        ) : (
          <div className="mx-auto w-full max-w-md">
            <MagicLinkRequest />
          </div>
        )}
      </ParticipantLayout>
    </>
  )
}
