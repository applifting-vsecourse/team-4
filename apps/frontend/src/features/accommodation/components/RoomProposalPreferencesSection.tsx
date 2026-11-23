import { useEffect } from "react"
import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES, SECTIONS } from "@/app/routes"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Button } from "@/components/ui/button"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Skeleton } from "@/components/ui/skeleton"
import { HTTPError } from "@/lib/api-client"

import { roomProposalPreferencesQueryOptions } from "@/features/accommodation/api/roomProposalQueryOptions"
import type { RoomProposalPreferences as Preferences } from "@/features/accommodation/api/roomProposalSchemas"
import {
  preferenceLabel,
  RoomProposalPreferences,
} from "@/features/accommodation/components/RoomProposalPreferences"
import { useSaveRoomProposalPreferences } from "@/features/accommodation/hooks/useSaveRoomProposalPreferences"
import { attributeLabels } from "@/features/accommodation/lib/evaluationView"

/** Where the Nastavení button of Ubytování leads (#389). */
export const ROOM_PROPOSAL_SETTINGS_HEADING = "room-proposal-settings-heading"

const stillApplies = ({ preferences, wishes, attributes }: Preferences) =>
  preferences.length
    ? `Platí dál: ${preferences
        .map(
          (item, index) =>
            `${index + 1}. ${preferenceLabel(item.id, wishes, attributeLabels(attributes))}`,
        )
        .join(", ")}.`
    : "Platí dál návrh bez měkkých preferencí."

/** Starts the form again only when the saved list itself changes. */
const formKey = ({ preferences }: Preferences) => JSON.stringify(preferences)

/** 409: the list holds what has meanwhile become the hard attribute. */
const isHardAttributeConflict = (error: unknown) =>
  error instanceof HTTPError && error.response.status === 409

// Nastavení → Návrh pokojů (#389): the saved soft preferences of the event's
// room proposal. A save makes the room proposals stale; a failed one keeps
// the unsent list in the form and says which list still applies.
export function RoomProposalPreferencesSection({
  organizationId,
  eventId,
  presentation = "section",
  invalidate,
  manageQuestionsAction,
}: {
  organizationId: string
  eventId: string
  presentation?: "section" | "dialog"
  /** Reloaded after a save: the questions show which of them the rules use (#485). */
  invalidate?: readonly (readonly unknown[])[]
  /** Override for isolated tests or embeddings without event navigation. */
  manageQuestionsAction?: ReactNode
}) {
  const setting = useQuery(roomProposalPreferencesQueryOptions(organizationId, eventId))
  const save = useSaveRoomProposalPreferences(organizationId, eventId, invalidate)
  const key = setting.data ? formKey(setting.data) : null
  const { reset } = save

  // A new saved list starts the form again; an error about the old form goes.
  useEffect(() => reset(), [key, reset])

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
      key={key}
      preferences={setting.data.preferences}
      wishes={setting.data.wishes}
      attributes={setting.data.attributes}
      manageQuestionsAction={
        manageQuestionsAction === undefined ? (
          <Button
            asChild
            variant="link"
            size="sm"
          >
            <Link
              to={ROUTES.eventSettings}
              params={{ organizationId, eventId }}
              search={{ tab: "registration" }}
              hash={SECTIONS.registrationQuestions}
            >
              Spravovat otázky
            </Link>
          </Button>
        ) : (
          manageQuestionsAction
        )
      }
      isSaving={save.isPending}
      saveError={
        save.isError
          ? isHardAttributeConflict(save.error)
            ? `Tvrdé pravidlo ubytování nelze přidat mezi měkké preference; odeberte ho ze seznamu. ${stillApplies(setting.data)}`
            : stillApplies(setting.data)
          : undefined
      }
      onSave={(next) =>
        save.mutate(next, {
          // The neutral toast: the green one fails the contrast check (#400).
          onSuccess: () => toast.success("Preference návrhu pokojů byly uloženy."),
        })
      }
    />
  )

  if (presentation === "dialog") return content

  return (
    <CollapsibleSection
      headingId={ROOM_PROPOSAL_SETTINGS_HEADING}
      title="Návrh pokojů"
      alwaysOpen
    >
      {content}
    </CollapsibleSection>
  )
}
