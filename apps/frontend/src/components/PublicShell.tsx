import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"

/** Frame of the public pages: the shared header, no sign-in. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">{children}</div>
      </main>
    </>
  )
}
