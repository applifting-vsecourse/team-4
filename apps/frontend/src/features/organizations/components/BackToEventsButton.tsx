import { Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { useOrganizations } from "@/features/organizations/hooks/useOrganizations"
import { chooseOrganization, lastOrganization } from "@/features/organizations/lib/lastOrganization"

type BackToEventsButtonProps = {
  /** The organization of the URL; used only when it is one of the own. */
  organizationId?: string
  /** The signed-in account, whose last used organization is the fallback. */
  userId?: string
}

// The way out of "Záznam není dostupný" (S2-03): the event list
// of an own organization, never the foreign one the link pointed to.
export function BackToEventsButton({ organizationId, userId }: BackToEventsButtonProps) {
  const { organizations, isPending, error } = useOrganizations()

  if (isPending) return <Button disabled>Zpět na přehled akcí</Button>

  if (error) {
    return (
      <Button asChild>
        <Link to={ROUTES.organizations}>Zpět na přehled akcí</Link>
      </Button>
    )
  }

  const target = chooseOrganization(organizations, {
    fromUrl: organizationId,
    lastUsed: userId ? lastOrganization(userId) : undefined,
  })

  if (!target) {
    return (
      <Button asChild>
        <Link to={ROUTES.newOrganization}>
          <Plus />
          Založit organizaci
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild>
      <Link
        to={ROUTES.organization}
        params={{ organizationId: target.id }}
      >
        Zpět na přehled akcí
      </Link>
    </Button>
  )
}
