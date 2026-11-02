import type { ReactNode } from "react"

import { BrandMark } from "@/components/BrandMark"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

// Participant e-mails (F45-1). Design only: every value is passed in. The shell
// shows the message as a mail client would: subject and recipient above a
// narrow card with the brand, the content and the "Moje přihlášky" action.

export type EmailLayoutProps = {
  subject: string
  recipient: string
  heading: string
  eventName: string
  /** False when the contact e-mail differs from the account's sign-in e-mail: the button then leads to the standard sign-in, not to a magic link. */
  hasMagicLink?: boolean
  children: ReactNode
}

export function EmailLayout({
  subject,
  recipient,
  heading,
  eventName,
  hasMagicLink = true,
  children,
}: EmailLayoutProps) {
  return (
    <main className="min-h-svh bg-background px-4 py-8 md:py-12">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <dl className="space-y-1 text-sm">
          <div className="flex gap-4">
            <dt className="w-16 shrink-0 font-medium">Předmět</dt>
            <dd>{subject}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-16 shrink-0 font-medium">Komu</dt>
            <dd>{recipient}</dd>
          </div>
        </dl>
        <Separator />
        <Card>
          <CardHeader>
            <BrandMark isLarge />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-h3">{heading}</h1>
                <p className="text-base">{eventName}</p>
              </div>
              {children}
              <Button
                asChild
                size="lg"
                className="w-full"
              >
                <a
                  href={
                    hasMagicLink
                      ? "https://akc.io/my-registrations/verify?token=ukazka"
                      : "https://akc.io/my-registrations"
                  }
                >
                  Moje přihlášky
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">
                {hasMagicLink
                  ? "Přihlašovací odkaz platí 15 minut a jde použít jen jednou. Až vyprší, na stránce si můžete vyžádat nový."
                  : "Přihlaste se e-mailem, který jste použili při registraci. Tento e-mail neobsahuje přihlašovací odkaz."}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">© akc.io</p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
