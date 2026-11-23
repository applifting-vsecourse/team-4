import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { ParticipantRoomPlacements } from "@/features/accommodation/components/ParticipantRoomPlacements"
import { participantSessionQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"
import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { ParticipantSessionEnded } from "@/features/participant-access/components/ParticipantSessionEnded"
import { ParticipantTermProgrammes } from "@/features/programme/components/ParticipantTermProgrammes"
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
      <ParticipantLayout>
        <ParticipantRegistrationDetail
          registrationId={registrationId}
          sessionEnded={<ParticipantSessionEnded />}
          renderProgramme={(registration) => (
            <ParticipantTermProgrammes
              registrationId={registration.id}
              // A released term has no programme for the participant (F35-2a).
              terms={registration.terms.flatMap((term) =>
                term.status === "cancelled" ? [] : [{ ...term, status: term.status }],
              )}
            />
          )}
          // Rooms are only for confirmed terms (S4-02).
          renderRooms={(registration) => {
            const confirmedTermIds = registration.terms.flatMap((term) =>
              term.status === "confirmed" ? [term.termId] : [],
            )
            return confirmedTermIds.length > 0 ? (
              <ParticipantRoomPlacements
                registrationId={registration.id}
                confirmedTermIds={confirmedTermIds}
              />
            ) : null
          }}
        />
      </ParticipantLayout>
    </>
  )
}
