import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { BrandMark } from "@/components/BrandMark"

export function HeaderLogo() {
  return (
    <Link
      to={ROUTES.home}
      className="rounded-sm tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <BrandMark isLarge />
    </Link>
  )
}
