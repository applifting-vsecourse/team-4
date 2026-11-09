import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"

type ParticipantLayoutProps = {
  // The header's account action: "Odhlásit se" once signed in.
  action?: ReactNode
  children: ReactNode
}

// Frame of the participant pages: the shared header. A participant link never
// opens organizer access; "Organizátor" leads to the organizer's own sign-in.
export function ParticipantLayout({ action, children }: ParticipantLayoutProps) {
  return (
    <>
      <Header account={action} />
      <main className="min-h-svh min-w-0">
        <div className="mx-auto w-full max-w-4xl min-w-0 px-4 py-6 md:py-12">{children}</div>
      </main>
    </>
  )
}
