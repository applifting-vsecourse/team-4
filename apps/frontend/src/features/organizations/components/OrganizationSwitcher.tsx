import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useOrganizations } from "@/features/organizations/hooks/useOrganizations"

// Switching is plain navigation: the active organization is the one in the URL.
export function OrganizationSwitcher() {
  const { organizations } = useOrganizations()
  const navigate = useNavigate()
  const { organizationId } = useParams({ strict: false })
  const active = organizations.find((organization) => organization.id === organizationId)

  if (organizations.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Přepnout organizaci"
          className="max-w-40 sm:max-w-56"
        >
          <span className="truncate">{active?.name ?? "Organizace"}</span>
          <ChevronsUpDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
      >
        <DropdownMenuLabel>Vaše organizace</DropdownMenuLabel>
        {organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            onSelect={() =>
              void navigate({
                to: "/organizations/$organizationId",
                params: { organizationId: organization.id },
              })
            }
          >
            <span className="truncate">{organization.name}</span>
            {organization.id === active?.id ? (
              <Check
                aria-label="Aktivní organizace"
                className="ml-auto size-4"
              />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={ROUTES.newOrganization}>
            <Plus aria-hidden />
            Založit organizaci
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
