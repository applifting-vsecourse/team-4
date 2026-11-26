import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { type RegistrationDetailTab } from "@/features/registrations/lib/detailTabs"

type RegistrationLink = {
  organizationId: string
  eventId: string
  registrationId: string
  /** The tab of the detail to open; the contact data without one. */
  tab?: RegistrationDetailTab
}

const toLink = ({ tab, ...params }: RegistrationLink) => ({
  params,
  search: tab ? { tab } : {},
})

type RegistrationNameCellProps = {
  link: RegistrationLink
  firstName: string
  lastName: string
  children?: ReactNode
}

// The whole row opens the registration's detail, as in the registration list.
// Safari does not position content against a <tr>, so every cell carries its
// own overlay; only the participant's name is exposed to assistive technology.
export function RegistrationNameCell({
  link,
  firstName,
  lastName,
  children,
}: RegistrationNameCellProps) {
  return (
    <TableCell className="relative">
      <Link
        to={ROUTES.registration}
        {...toLink(link)}
        aria-label={`Přihláška ${firstName} ${lastName}`}
        className="block font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        {firstName} {lastName}
      </Link>
      {children}
    </TableCell>
  )
}

type RegistrationCellProps = {
  link: RegistrationLink
  /** Amounts are right-aligned. */
  isNumeric?: boolean
  /** Longer text such as term labels may wrap; values stay on one line. */
  canWrap?: boolean
  children: ReactNode
}

export function RegistrationCell({
  link,
  isNumeric = false,
  canWrap = false,
  children,
}: RegistrationCellProps) {
  return (
    <TableCell
      className={cn("relative", !canWrap && "whitespace-nowrap", isNumeric && "text-right")}
    >
      {children}
      <Link
        to={ROUTES.registration}
        {...toLink(link)}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0"
      />
    </TableCell>
  )
}
