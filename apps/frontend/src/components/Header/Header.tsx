import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type HeaderProps = {
  /**
   * The page's own account action: the organizer's menu or the participant's
   * "Odhlásit se". Passed as a slot so `components/` does not import features.
   */
  account?: ReactNode
}

/**
 * The one header of every page outside the organization's administration.
 * The logo and audience links sit on the left. Entry buttons, theme and
 * account actions sit on the right.
 */
export function Header({ account }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-280 items-center justify-between gap-3 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <HeaderLogo />
          <AudienceLinks />
        </div>
        <div className="flex items-center gap-2">
          <nav
            aria-label="Vstup do aplikace"
            className="hidden items-center gap-2 lg:flex"
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
          <div className="hidden lg:block">
            <ThemeSwitcher />
          </div>
          {account}
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

const AUDIENCES = [
  { to: ROUTES.forParticipants, label: "Pro účastníky" },
  { to: ROUTES.forOrganizers, label: "Pro organizátory" },
] as const

function AudienceLinks({ isInMenu = false }: { isInMenu?: boolean }) {
  return (
    <nav
      aria-label="Informace o akc.io"
      className={isInMenu ? "flex flex-col gap-2 px-4" : "hidden items-center gap-2 lg:flex"}
    >
      {AUDIENCES.map(({ to, label }) => {
        const link = <Link to={to}>{label}</Link>
        return (
          <Button
            asChild
            variant={isInMenu ? "outline" : "ghost"}
            size={isInMenu ? "default" : "sm"}
            key={to}
          >
            {isInMenu ? <SheetClose asChild>{link}</SheetClose> : link}
          </Button>
        )
      })}
    </nav>
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
          className="lg:hidden"
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
        <AudienceLinks isInMenu />
        <nav
          aria-label="Vstup do aplikace"
          className="flex flex-col gap-2 px-4"
        >
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.catalog}>Katalog akcí</Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.myRegistrations}>Moje přihlášky</Link>
          </Button>
        </nav>
        <div className="px-4">
          <Button
            asChild
            className="w-full"
          >
            <Link to={ROUTES.login}>Organizátor</Link>
          </Button>
        </div>
        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">Motiv</span>
          <ThemeSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  )
}
