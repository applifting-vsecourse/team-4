import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

export function HeaderLogo() {
  return (
    <Link
      to={ROUTES.home}
      className="font-semibold tracking-tight"
    >
      akc.io
    </Link>
  )
}
