import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Bell, LogOut, UserRound } from "lucide-react"

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

import { participantNotificationsQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { UnreadDot } from "@/features/participant-access/components/UnreadDot"
import { useParticipantLogout } from "@/features/participant-access/hooks/useParticipantLogout"

type ParticipantAccountMenuProps = {
  /** The sign-in address, shown only inside the menu (S4-08). */
  email: string
}

// The participant's account under the user icon: the sign-in e-mail, the
// notifications (S4-06), the profile and the end of the session. A dot on
// the icon and on Oznámení says that a notification was not opened yet.
export function ParticipantAccountMenu({ email }: ParticipantAccountMenuProps) {
  const logout = useParticipantLogout()
  const notifications = useQuery(participantNotificationsQueryOptions())
  const hasUnread = notifications.data?.items.some((item) => !item.isRead) ?? false
  const unreadId = useId()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Účet"
          aria-describedby={hasUnread ? unreadId : undefined}
          className="relative"
        >
          <Avatar className="size-8">
            <AvatarFallback>
              <UserRound aria-hidden />
            </AvatarFallback>
          </Avatar>
          {hasUnread ? (
            <>
              <UnreadDot className="absolute top-1 right-1 ring-2 ring-background" />
              <span
                id={unreadId}
                className="sr-only"
              >
                Máte nepřečtená oznámení
              </span>
            </>
          ) : null}
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
          <Link to={ROUTES.myNotifications}>
            <Bell aria-hidden />
            Oznámení
            {hasUnread ? (
              <>
                <span className="sr-only"> (nepřečtená)</span>
                <UnreadDot className="ml-auto" />
              </>
            ) : null}
          </Link>
        </DropdownMenuItem>
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
