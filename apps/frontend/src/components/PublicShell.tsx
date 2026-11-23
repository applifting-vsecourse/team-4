import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"

/** Frame of the public pages: the shared header, no sign-in. */
export function PublicShell({ children, header }: { children: ReactNode; header?: ReactNode }) {
  return (
    <>
      {header ?? <Header />}
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">{children}</div>
      </main>
    </>
  )
}
