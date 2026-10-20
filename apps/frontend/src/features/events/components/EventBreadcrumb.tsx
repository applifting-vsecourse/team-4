import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type EventBreadcrumbProps = {
  organizationId: string
  organizationName?: string
  /** The event, when the page belongs to one. */
  event?: { id: string; name: string }
  /** Last crumb, e.g. "Termíny". Without it the last link is the current page. */
  current?: string
}

// "Organizace / Akce a turnusy / Akce / Termíny" (Wireframy E1, E3, N1).
export function EventBreadcrumb({
  organizationId,
  organizationName,
  event,
  current,
}: EventBreadcrumbProps) {
  const isEventsPage = !event && !current
  const isEventPage = Boolean(event) && !current

  return (
    <Breadcrumb className="mb-2">
      <BreadcrumbList>
        {organizationName ? (
          <>
            <BreadcrumbItem>{organizationName}</BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        ) : null}
        <BreadcrumbItem>
          {isEventsPage ? (
            <BreadcrumbPage>Akce a turnusy</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link
                to={ROUTES.organization}
                params={{ organizationId }}
              >
                Akce a turnusy
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {event ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {isEventPage ? (
                <BreadcrumbPage>{event.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    to={ROUTES.event}
                    params={{ organizationId, eventId: event.id }}
                  >
                    {event.name}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        ) : null}
        {current ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{current}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
