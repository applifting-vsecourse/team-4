import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

import { useOrganizations } from "@/features/organizations/hooks/useOrganizations"

// Switching is plain navigation: the active organization is the one in the URL.
export function OrganizationSwitcher() {
  const { organizations } = useOrganizations()
  const navigate = useNavigate()
  const { organizationId } = useParams({ strict: false })
  const active = organizations.find((organization) => organization.id === organizationId)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              variant="outline"
              aria-label="Přepnout organizaci"
              className="justify-center"
            >
              <Building2 aria-hidden />
              <span className="truncate">{active?.name ?? "Organizace"}</span>
              <ChevronsUpDown aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuLabel>Moje organizace</DropdownMenuLabel>
            {organizations.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onSelect={() =>
                  void navigate({
                    to: ROUTES.organization,
                    params: { organizationId: organization.id },
                  })
                }
              >
                <Building2 aria-hidden />
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
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
