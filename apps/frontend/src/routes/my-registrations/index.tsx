import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { participantSessionQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"
import { MyRegistrationsShell } from "@/features/participant-access/components/MyRegistrationsShell"
import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { ParticipantLogoutButton } from "@/features/participant-access/components/ParticipantLogoutButton"

// Participant access without a password (S2-13): the e-mail link opens the
// registrations of its own account; without a session the visitor can ask for
// a new link. The organizer sign-in is separate.
export const Route = createFileRoute("/my-registrations/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantSessionQueryOptions()),
  component: MyRegistrationsPage,
})

function MyRegistrationsPage() {
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
      <Seo title="Moje přihlášky" />
      <ParticipantLayout action={<ParticipantLogoutButton />}>
        <MyRegistrationsShell participant={participant} />
      </ParticipantLayout>
    </>
  )
}
