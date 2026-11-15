import type { ReactNode } from "react"

import { Header } from "@/components/Header/Header"
import { Card, CardContent } from "@/components/ui/card"

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

/**
 * Sign-in / sign-up pages keep the app chrome and use the same card surface as
 * the participant's magic-link sign-in. The header has no account action here:
 * nobody is signed in yet.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <>
      <Header />
      <main className="min-h-svh">
        <section className="mx-auto w-full max-w-md px-4 py-12 md:py-16">
          <Card>
            <CardContent className="space-y-6">
              <header className="space-y-2">
                <h1 className="text-h2">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </header>

              <div>{children}</div>

              <p className="text-sm text-muted-foreground">{footer}</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  )
}
