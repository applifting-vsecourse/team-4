import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// A foreign and a missing organization look the same (S2-03).
export function OrganizationUnavailable() {
  return (
    <section className="mx-auto w-full max-w-sm px-4 py-16">
      <Alert variant="destructive">
        <AlertTitle>Záznam není dostupný</AlertTitle>
        <AlertDescription>Tato organizace neexistuje, nebo k ní nemáte přístup.</AlertDescription>
      </Alert>
      <Button
        asChild
        variant="outline"
        className="mt-4"
      >
        <Link to={ROUTES.organizations}>Zpět na moje organizace</Link>
      </Button>
    </section>
  )
}
