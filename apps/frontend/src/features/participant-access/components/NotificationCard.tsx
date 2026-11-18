import { Link } from "@tanstack/react-router"
import { X } from "lucide-react"

import { ROUTES, SECTIONS } from "@/app/routes"
import { Money } from "@/components/Money"
import { ParticipationBadge } from "@/components/ParticipationBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCalendarRange, formatPragueDateTime } from "@/lib/date"

import type {
  NotificationKind,
  ParticipantNotification,
} from "@/features/participant-access/api/participantNotificationSchemas"
import { UnreadDot } from "@/features/participant-access/components/UnreadDot"

export const NOTIFICATION_TITLES: Record<NotificationKind, string> = {
  decision: "Rozhodnutí o účasti",
  changeApproved: "Žádost o změnu schválena",
  changeRejected: "Žádost o změnu zamítnuta",
  payment: "Přijatá platba",
}

type NotificationCardProps = {
  notification: ParticipantNotification
  /** Called when the participant opens the notification. */
  onOpen: () => void
  onDismiss: () => void
}

// One notification (S4-06). The whole card opens the registration, a payment
// its received payments; the cross hides the notification.
export function NotificationCard({ notification, onOpen, onDismiss }: NotificationCardProps) {
  const title = NOTIFICATION_TITLES[notification.kind]

  return (
    <Card className="relative">
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-2 shrink-0 items-center">
            {notification.isRead ? null : <UnreadDot />}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <h2 className="text-h4 wrap-break-word">
                <Link
                  to={ROUTES.myRegistration}
                  params={{ registrationId: notification.registrationId }}
                  hash={notification.kind === "payment" ? SECTIONS.receivedPayments : undefined}
                  onClick={onOpen}
                  // A middle click opens it in a new tab: opened, too.
                  onAuxClick={onOpen}
                  className="text-foreground after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {notification.isRead ? null : <span className="sr-only">Nepřečteno: </span>}
                  {title}
                </Link>
              </h2>
              <p className="text-sm wrap-break-word">{notification.eventName}</p>
            </div>

            {notification.terms.length > 0 ? (
              <ul className="space-y-2">
                {notification.terms.map((term) => (
                  <li
                    key={`${term.label}-${term.startDate}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                  >
                    <span className="wrap-break-word">
                      {term.label} · {formatCalendarRange(term.startDate, term.endDate)}
                    </span>
                    <ParticipationBadge status={term.status} />
                  </li>
                ))}
              </ul>
            ) : null}

            {notification.amountMinor !== null ? (
              <p className="text-sm">
                <Money
                  minor={notification.amountMinor}
                  isEmphasised
                />
              </p>
            ) : null}

            <p className="text-sm text-muted-foreground">
              <time dateTime={notification.at}>{formatPragueDateTime(notification.at)}</time>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative z-10 -mt-1 -mr-2 shrink-0"
            aria-label={`Skrýt oznámení ${title}, ${notification.eventName}`}
            onClick={onDismiss}
          >
            <X aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
