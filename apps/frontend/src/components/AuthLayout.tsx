import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

/**
 * Sign-in / sign-up pages keep the app chrome — they are pages of this app,
 * not a separate island. No card: the form sits on the page like any content.
 * The header omits the auth menu here; offering "Sign in" on the sign-in page
 * would be noise.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <>
      <Header userMenu={null} />
      <main className="min-h-svh">
        <section className="mx-auto w-full max-w-sm px-4 py-16">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
        </section>
      </main>
    </>
  )
}
