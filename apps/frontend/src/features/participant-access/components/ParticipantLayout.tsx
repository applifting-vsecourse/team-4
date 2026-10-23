import type { ReactNode } from "react"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"

type ParticipantLayoutProps = {
  // Right side of the header: "Odhlásit se" once signed in (Figma M2).
  action?: ReactNode
  children: ReactNode
}

// Frame of the participant pages: logo and nothing of the organizer's
// navigation, since a participant link never opens organizer access.
export function ParticipantLayout({ action, children }: ParticipantLayoutProps) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4">
          <HeaderLogo />
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            {action}
          </div>
        </div>
      </header>
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">{children}</div>
      </main>
    </>
  )
}
