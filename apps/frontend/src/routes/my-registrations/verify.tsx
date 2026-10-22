import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"

import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"
import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { useOpenSession } from "@/features/participant-access/hooks/useOpenSession"

// Where the link in the e-mail lands. Opening it exchanges the token for the
// session once; the page never shows private data itself.
export const Route = createFileRoute("/my-registrations/verify")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: VerifyPage,
})

const INVALID_LINK =
  "Odkaz už není platný: byl použit, vypršel nebo není správný. Vyžádejte si nový."

function VerifyPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const status = useOpenSession(token)

  useEffect(() => {
    if (status === "opened") void navigate({ to: ROUTES.myRegistrations, replace: true })
  }, [status, navigate])

  const isFailed = status === "failed"

  return (
    <>
      <Seo title="Přihlášení k přihláškám" />
      <ParticipantLayout>
        <div className="mx-auto w-full max-w-md">
          {isFailed ? (
            <MagicLinkRequest notice={INVALID_LINK} />
          ) : (
            <div
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
              Ověřujeme váš odkaz…
            </div>
          )}
        </div>
      </ParticipantLayout>
    </>
  )
}
