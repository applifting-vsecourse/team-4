import { ROUTES } from "@/app/routes"
import { HeaderNavLink } from "@/components/Header/HeaderNavLink"

// The logo already links home, so "Home" would be a duplicate.
export function HeaderNav() {
  return (
    <nav className="flex items-center gap-1">
      <HeaderNavLink to={ROUTES.quacks}>Quacks</HeaderNavLink>
    </nav>
  )
}
