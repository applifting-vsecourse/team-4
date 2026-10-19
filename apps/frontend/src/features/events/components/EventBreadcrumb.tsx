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
  organizationName: string
  /** The event, linked when a page below it is open. */
  event?: { id: string; name: string }
  current: string
}

export function EventBreadcrumb({
  organizationId,
  organizationName,
  event,
  current,
}: EventBreadcrumbProps) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to={ROUTES.organization}
              params={{ organizationId }}
            >
              {organizationName}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {event ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to={ROUTES.event}
                  params={{ organizationId, eventId: event.id }}
                >
                  {event.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        ) : null}
        <BreadcrumbItem>
          <BreadcrumbPage>{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
