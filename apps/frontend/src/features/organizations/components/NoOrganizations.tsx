import { Link } from "@tanstack/react-router"
import { Building2 } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function NoOrganizations() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>Zatím nemáte organizaci</EmptyTitle>
        <EmptyDescription>
          Akce a přihlášky spravujete v rámci organizace. Založte první.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to={ROUTES.newOrganization}>Založit organizaci</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
