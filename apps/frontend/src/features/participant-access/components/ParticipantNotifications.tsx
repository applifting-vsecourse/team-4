import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bell, CheckCheck } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { EmptyState } from "@/components/EmptyState"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageHeader } from "@/components/PageHeader"
import { PendingButton } from "@/components/PendingButton"
import { Skeleton } from "@/components/ui/skeleton"

import { participantNotificationsQueryOptions } from "@/features/participant-access/api/participantQueryOptions"
import { NotificationCard } from "@/features/participant-access/components/NotificationCard"
import { useDismissNotification } from "@/features/participant-access/hooks/useDismissNotification"
import { useMarkAllNotificationsRead } from "@/features/participant-access/hooks/useMarkAllNotificationsRead"
import { useMarkNotificationRead } from "@/features/participant-access/hooks/useMarkNotificationRead"

type ParticipantNotificationsProps = {
  /** Shown instead when the session ended while the page was open. */
  sessionEnded: ReactNode
}

// Oznámení (S4-06): saved decisions, decided change requests and received
// payments of the participant's own registrations, newest first. Opening one
// marks it read; the cross hides it for good.
export function ParticipantNotifications({ sessionEnded }: ParticipantNotificationsProps) {
  const query = useQuery(participantNotificationsQueryOptions())
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const dismiss = useDismissNotification()

  if (query.data === null) return sessionEnded

  const items = query.data?.items
  const hasUnread = items?.some((item) => !item.isRead) ?? false

  return (
    <section className="space-y-6">
      <BackLink to={ROUTES.myRegistrations}>Moje přihlášky</BackLink>
      <PageHeader
        title="Oznámení"
        actions={
          hasUnread ? (
            <PendingButton
              variant="outline"
              size="sm"
              icon={<CheckCheck aria-hidden />}
              isPending={markAllRead.isPending}
              onClick={() =>
                markAllRead.mutate(
                  (items ?? []).filter((item) => !item.isRead).map((item) => item.id),
                )
              }
            >
              Označit vše jako přečtené
            </PendingButton>
          ) : null
        }
      />
      {items ? (
        items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Zatím nemáte žádná oznámení"
          />
        ) : (
          <ul className="space-y-4">
            {items.map((notification) => (
              <li key={notification.id}>
                <NotificationCard
                  notification={notification}
                  onOpen={() => {
                    if (!notification.isRead) markRead.mutate(notification.id)
                  }}
                  onDismiss={() => dismiss.mutate(notification.id)}
                />
              </li>
            ))}
          </ul>
        )
      ) : query.isError ? (
        <LoadError
          title="Oznámení se nepodařilo načíst"
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : (
        <LoadingBlock
          label="Načítání oznámení"
          className="space-y-4"
        >
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </LoadingBlock>
      )}
    </section>
  )
}
