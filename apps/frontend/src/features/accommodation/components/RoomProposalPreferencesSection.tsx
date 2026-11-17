import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Skeleton } from "@/components/ui/skeleton"

import { roomProposalPreferencesQueryOptions } from "@/features/accommodation/api/roomProposalQueryOptions"
import type { RoomProposalPreferences as Preferences } from "@/features/accommodation/api/roomProposalSchemas"
import {
  preferenceLabel,
  RoomProposalPreferences,
} from "@/features/accommodation/components/RoomProposalPreferences"
import { useSaveRoomProposalPreferences } from "@/features/accommodation/hooks/useSaveRoomProposalPreferences"

/** Where the Nastavení button of Ubytování leads (#389). */
export const ROOM_PROPOSAL_SETTINGS_HEADING = "room-proposal-settings-heading"

const stillApplies = ({ preferences, wishes }: Preferences) =>
  preferences.length
    ? `Platí dál: ${preferences
        .map((item, index) => `${index + 1}. ${preferenceLabel(item.id, wishes)}`)
        .join(", ")}.`
    : "Platí dál návrh bez měkkých preferencí."

/** Starts the form again only when the saved list itself changes. */
const formKey = ({ preferences }: Preferences) => JSON.stringify(preferences)

// Nastavení → Návrh pokojů (#389): the saved soft preferences of the event's
// room proposal. A save makes the room proposals stale; a failed one keeps
// the unsent list in the form and says which list still applies.
export function RoomProposalPreferencesSection({
  organizationId,
  eventId,
}: {
  organizationId: string
  eventId: string
}) {
  const setting = useQuery(roomProposalPreferencesQueryOptions(organizationId, eventId))
  const save = useSaveRoomProposalPreferences(organizationId, eventId)

  const content = setting.isPending ? (
    <LoadingBlock label="Načítání preferencí návrhu pokojů">
      <Skeleton className="h-40 w-full" />
    </LoadingBlock>
  ) : setting.isError ? (
    <LoadError
      title="Preference návrhu pokojů se nepodařilo načíst"
      isRetrying={setting.isFetching}
      onRetry={() => setting.refetch()}
    />
  ) : (
    <RoomProposalPreferences
      key={formKey(setting.data)}
      preferences={setting.data.preferences}
      wishes={setting.data.wishes}
      attributes={setting.data.attributes}
      isSaving={save.isPending}
      saveError={save.isError ? stillApplies(setting.data) : undefined}
      onSave={(next) =>
        save.mutate(next, {
          // The neutral toast: the green one fails the contrast check (#400).
          onSuccess: () =>
            toast.success("Preference návrhu pokojů byly uloženy.", { richColors: false }),
        })
      }
    />
  )

  return (
    <CollapsibleSection
      headingId={ROOM_PROPOSAL_SETTINGS_HEADING}
      title="Návrh pokojů"
    >
      {content}
    </CollapsibleSection>
  )
}
