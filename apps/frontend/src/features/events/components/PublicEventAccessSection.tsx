import { Card, CardContent } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { EventPublication } from "@/features/events/components/EventPublication"
import { RegistrationSection } from "@/features/events/components/RegistrationSection"

type PublicEventAccessSectionProps = {
  organizationId: string
  event: EventDetail
}

export function PublicEventAccessSection({ organizationId, event }: PublicEventAccessSectionProps) {
  return (
    <CollapsibleSection
      headingId="public-access-heading"
      title="Veřejný přístup"
    >
      <div className="space-y-4">
        <Card>
          <CardContent>
            <EventPublication
              organizationId={organizationId}
              event={event}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <RegistrationSection
              organizationId={organizationId}
              event={event}
            />
          </CardContent>
        </Card>
      </div>
    </CollapsibleSection>
  )
}
