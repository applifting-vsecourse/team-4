import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { participantSessionQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"
import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { ParticipantLogoutButton } from "@/features/participant-access/components/ParticipantLogoutButton"
import { ParticipantSessionEnded } from "@/features/participant-access/components/ParticipantSessionEnded"
import { ParticipantRegistrationDetail } from "@/features/registrations/components/ParticipantRegistrationDetail"

// Detail of one own registration (S2-14). Reading is bound to the verified
// session on the server; without one the visitor can ask for a new link.
export const Route = createFileRoute("/my-registrations/$registrationId")({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantSessionQueryOptions()),
  component: MyRegistrationPage,
})

function MyRegistrationPage() {
  const { registrationId } = Route.useParams()
  const { data: participant } = useSuspenseQuery(participantSessionQueryOptions())

  if (!participant) {
    return (
      <>
        <Seo title="Moje přihlášky" />
        <ParticipantLayout>
          <div className="mx-auto w-full max-w-md">
            <MagicLinkRequest />
          </div>
        </ParticipantLayout>
      </>
    )
  }

  return (
    <>
      <Seo title="Detail přihlášky" />
      <ParticipantLayout action={<ParticipantLogoutButton />}>
        <ParticipantRegistrationDetail
          registrationId={registrationId}
          sessionEnded={<ParticipantSessionEnded />}
        />
      </ParticipantLayout>
    </>
  )
}
