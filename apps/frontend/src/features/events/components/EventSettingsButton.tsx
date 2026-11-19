import { Link } from "@tanstack/react-router"
import { Settings } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

// The context "Nastavení" of Přihlášky and Ubytování: the event's one
// settings page, opened at the section that belongs to the page (#384).
export function EventSettingsButton({
  organizationId,
  eventId,
  section,
}: {
  organizationId: string
  eventId: string
  /** The `headingId` of the section to open. */
  section: string
}) {
  return (
    <Button
      asChild
      variant="outline"
    >
      <Link
        to={ROUTES.eventSettings}
        params={{ organizationId, eventId }}
        hash={section}
      >
        <Settings />
        Nastavení
      </Link>
    </Button>
  )
}
