import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"

import type { Participant } from "@/features/participant-access/api/participantSchemas"
import { ParticipantAccountMenu } from "@/features/participant-access/components/ParticipantAccountMenu"

type ParticipantLayoutProps = {
  /** The signed-in participant; without one the shared public header is shown. */
  participant?: Participant | null
  children: ReactNode
}

// Frame of the participant pages. Signed in, the header is the participant's
// portal with the account menu (S4-08); a participant link never opens
// organizer access.
export function ParticipantLayout({ participant, children }: ParticipantLayoutProps) {
  return (
    <>
      {participant ? (
        <Header
          variant="participant"
          account={<ParticipantAccountMenu email={participant.email} />}
        />
      ) : (
        <Header />
      )}
      <main className="min-h-svh min-w-0">
        <div className="mx-auto w-full max-w-4xl min-w-0 px-4 py-6 md:py-12">{children}</div>
      </main>
    </>
  )
}
