import { Link } from "@tanstack/react-router"
import { Building2 } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"

export function NoOrganizations() {
  return (
    <EmptyState
      icon={Building2}
      title="Zatím nemáte organizaci"
      description="Akce a přihlášky spravujete v rámci organizace. Založte první."
      action={
        <Button asChild>
          <Link to={ROUTES.newOrganization}>Založit organizaci</Link>
        </Button>
      }
    />
  )
}
