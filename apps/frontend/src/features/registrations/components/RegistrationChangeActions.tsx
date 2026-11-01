import { LogOut, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"

// Moje přihlášky → Detail přihlášky (F35-2a): the entry to editing, moving and
// cancelling an own registration. Not offered for a cancelled registration.
// Design only.
export function RegistrationChangeActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline">
        <LogOut />
        Odhlásit se z akce
      </Button>
      <Button>
        <Pencil />
        Upravit přihlášku
      </Button>
    </div>
  )
}
