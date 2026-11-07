import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type HeaderProps = {
  /**
   * The page's own account action: the organizer's menu or the participant's
   * "Odhlásit se". Passed as a slot so `components/` does not import features.
   */
  account?: ReactNode
}

/**
 * The one header of every page outside the organization's administration
 * (BUG 279): the same entries in the same places on every page. The entries
 * follow the logo and the theme closes the row, so an account action in
 * between never moves them.
 */
export function Header({ account }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-280 items-center gap-3 px-4 py-4 md:px-8">
        <HeaderLogo />
        <nav
          aria-label="Vstup do aplikace"
          className="hidden items-center gap-2 md:flex"
        >
          <Button
            asChild
            variant="ghost"
            size="sm"
          >
            <Link to={ROUTES.catalog}>Katalog akcí</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
          >
            <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
          </Button>
          <Button
            asChild
            size="sm"
          >
            {/* Login offers organizer signup too; a signed-in organizer goes on to the organizations. */}
            <Link to={ROUTES.login}>Organizátor</Link>
          </Button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {account}
          <div className="hidden md:block">
            <ThemeSwitcher />
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Otevřít menu"
          className="md:hidden"
        >
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        lang="cs"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav
          aria-label="Vstup do aplikace"
          className="flex flex-col gap-2 px-4"
        >
          <Button asChild>
            <Link to={ROUTES.login}>Organizátor</Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.catalog}>Katalog akcí</Link>
          </Button>
        </nav>
        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">Motiv</span>
          <ThemeSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  )
}
