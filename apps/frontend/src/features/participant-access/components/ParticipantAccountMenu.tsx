import { Link } from "@tanstack/react-router"
import { LogOut, UserRound } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useParticipantLogout } from "@/features/participant-access/hooks/useParticipantLogout"

type ParticipantAccountMenuProps = {
  /** The sign-in address, shown only inside the menu (S4-08). */
  email: string
}

// The participant's account under the user icon: the sign-in e-mail, the
// profile and the end of the session.
export function ParticipantAccountMenu({ email }: ParticipantAccountMenuProps) {
  const logout = useParticipantLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Účet"
        >
          <Avatar className="size-8">
            <AvatarFallback>
              <UserRound aria-hidden />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
      >
        <DropdownMenuLabel>
          <span className="break-all">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={ROUTES.myProfile}>
            <UserRound aria-hidden />
            Můj profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut aria-hidden />
          Odhlásit se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
