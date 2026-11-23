import type { ReactNode } from "react"

import { ParticipantAwareHeader } from "@/features/participant-access/components/ParticipantAwareHeader"

// Frame of the participant pages. Signed in, the header is the participant's
// portal with the account menu (S4-08); a participant link never opens
// organizer access.
export function ParticipantLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ParticipantAwareHeader variant="participant" />
      <main className="min-h-svh min-w-0">
        <div className="mx-auto w-full max-w-4xl min-w-0 px-4 py-6 md:py-12">{children}</div>
      </main>
    </>
  )
}
