import { Link } from "@tanstack/react-router"
import { CalendarX, Pencil } from "lucide-react"

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
    <div className="flex flex-col gap-2 sm:flex-row">
      {registrationId ? (
        <Button
          asChild
          className="w-full sm:w-auto"
        >
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
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        onClick={onCancelRegistration}
      >
        <CalendarX />
        Zrušit účast
      </Button>
    </div>
  )
}
