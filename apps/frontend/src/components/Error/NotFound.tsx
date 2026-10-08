import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

export function NotFound() {
  return (
    <ErrorLayout
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      action={
        <Button asChild>
          <Link to={ROUTES.home}>Go home</Link>
        </Button>
      }
    />
  )
}
