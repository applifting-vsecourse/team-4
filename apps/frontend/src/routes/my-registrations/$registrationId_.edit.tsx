import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { participantSessionQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"
import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { ParticipantLogoutButton } from "@/features/participant-access/components/ParticipantLogoutButton"
import { ParticipantSessionEnded } from "@/features/participant-access/components/ParticipantSessionEnded"
import { ParticipantRegistrationEdit } from "@/features/registrations/components/ParticipantRegistrationEdit"

// Úprava přihlášky (F35-2a). Bound to the verified session on the server; a
// registration of someone else looks the same as a missing one.
export const Route = createFileRoute("/my-registrations/$registrationId_/edit")({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantSessionQueryOptions()),
  component: EditRegistrationPage,
})

function EditRegistrationPage() {
  const { registrationId } = Route.useParams()
  const navigate = Route.useNavigate()
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
      <Seo title="Úprava přihlášky" />
      <ParticipantLayout action={<ParticipantLogoutButton />}>
        <ParticipantRegistrationEdit
          registrationId={registrationId}
          sessionEnded={<ParticipantSessionEnded />}
          onLeave={() =>
            void navigate({ to: "/my-registrations/$registrationId", params: { registrationId } })
          }
        />
      </ParticipantLayout>
    </>
  )
}
