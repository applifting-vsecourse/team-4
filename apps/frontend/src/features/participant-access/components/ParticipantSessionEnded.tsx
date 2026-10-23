import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"

const NOTICE = "Přihlášení vypršelo. Pro zobrazení přihlášek si vyžádejte nový odkaz."

// The session ended while the page was open. Nothing private is shown any
// more and the participant gets the way to a new link (S2-13).
export function ParticipantSessionEnded() {
  return (
    <div className="mx-auto w-full max-w-md">
      <MagicLinkRequest notice={NOTICE} />
    </div>
  )
}
