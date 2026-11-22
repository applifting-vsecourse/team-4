import { Link } from "@tanstack/react-router"
import { CalendarX, Pencil } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

type RegistrationChangeActionsProps = {
  /** Without it the edit button is a plain one, as in the design preview. */
  registrationId?: string
  onCancelRegistration?: () => void
}

// Moje přihlášky → Detail přihlášky: manage an own registration. A pending
// change still allows access to management for independently saved wishes.
export function RegistrationChangeActions({
  registrationId,
  onCancelRegistration,
}: RegistrationChangeActionsProps) {
  return (
    <div className="flex items-start gap-2">
      {registrationId ? (
        <Button className="min-w-0 max-w-full shrink whitespace-normal" asChild>
          <Link
            to={ROUTES.myRegistrationEdit}
            params={{ registrationId }}
          >
            <Pencil />
            Spravovat přihlášku
          </Link>
        </Button>
      ) : (
        <Button className="min-w-0 max-w-full shrink whitespace-normal">
          <Pencil />
          Spravovat přihlášku
        </Button>
      )}
      {onCancelRegistration ? (
        <Button
          className="min-w-0 max-w-full shrink whitespace-normal"
          variant="outline"
          onClick={onCancelRegistration}
        >
          <CalendarX />
          Zrušit účast
        </Button>
      ) : null}
    </div>
  )
}
