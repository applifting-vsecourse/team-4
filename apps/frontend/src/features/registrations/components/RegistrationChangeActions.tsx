import { Link } from "@tanstack/react-router"
import { LogOut, Pencil } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

type RegistrationChangeActionsProps = {
  /** Without it the edit button is a plain one, as in the design preview. */
  registrationId?: string
  onCancelRegistration?: () => void
}

// Moje přihlášky → Detail přihlášky (F35-2a): the entry to editing, moving and
// cancelling an own registration. Not offered for a cancelled registration or
// while a request waits for the organizer.
export function RegistrationChangeActions({
  registrationId,
  onCancelRegistration,
}: RegistrationChangeActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={onCancelRegistration}
      >
        <LogOut />
        Odhlásit se z akce
      </Button>
      {registrationId ? (
        <Button asChild>
          <Link
            to={ROUTES.myRegistrationEdit}
            params={{ registrationId }}
          >
            <Pencil />
            Upravit přihlášku
          </Link>
        </Button>
      ) : (
        <Button>
          <Pencil />
          Upravit přihlášku
        </Button>
      )}
    </div>
  )
}
