import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { HardAttributeSection } from "@/features/accommodation/components/HardAttributeSection"
import { RoomProposalPreferencesSection } from "@/features/accommodation/components/RoomProposalPreferencesSection"

/** The existing, independently saved event rules, opened from the room split. */
export function RoomSplitRulesDialog({
  organizationId,
  eventId,
  isOpen,
  onOpenChange,
}: {
  organizationId: string
  eventId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pravidla rozdělení</DialogTitle>
          <DialogDescription>Nastavení platí pro všechny termíny akce.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <HardAttributeSection
            organizationId={organizationId}
            eventId={eventId}
            presentation="dialog"
          />
          <RoomProposalPreferencesSection
            organizationId={organizationId}
            eventId={eventId}
            presentation="dialog"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
