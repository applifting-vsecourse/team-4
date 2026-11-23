import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Skeleton } from "@/components/ui/skeleton"

import { hardAttributeQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { HardAttributeSettings } from "@/features/accommodation/components/HardAttributeSettings"
import { useSaveHardAttribute } from "@/features/accommodation/hooks/useSaveHardAttribute"
import { attributeLabels, type AttributeLabels } from "@/features/accommodation/lib/evaluationView"

/** Where the Nastavení buttons of Přihlášky and Ubytování lead (#384). */
export const ACCOMMODATION_RULES_HEADING = "accommodation-rules-heading"

const stillApplies = (hardAttribute: string | null, labels: AttributeLabels) =>
  hardAttribute === null
    ? "Pokoje se dál nedělí."
    : `Pokoje se dál dělí podle: ${labels.attribute(hardAttribute)}.`

// Nastavení → Pravidla ubytování (#384): the saved hard attribute of the
// event. A failed save says which choice still applies and keeps the chosen
// one in the form.
export function HardAttributeSection({
  organizationId,
  eventId,
  invalidate,
  presentation = "section",
}: {
  organizationId: string
  eventId: string
  /**
   * Reloaded after a save: the registrations show who needs a determination,
   * the questions which of them the rules use (#485).
   */
  invalidate?: readonly (readonly unknown[])[]
  presentation?: "section" | "dialog"
}) {
  const setting = useQuery(hardAttributeQueryOptions(organizationId, eventId))
  const save = useSaveHardAttribute(organizationId, eventId, invalidate)

  const content = setting.isPending ? (
    <LoadingBlock label="Načítání pravidel ubytování">
      <Skeleton className="h-40 w-full" />
    </LoadingBlock>
  ) : setting.isError ? (
    <LoadError
      title="Pravidla ubytování se nepodařilo načíst"
      isRetrying={setting.isFetching}
      onRetry={() => setting.refetch()}
    />
  ) : (
    <HardAttributeSettings
      // A newly saved or reloaded choice starts the form again.
      key={`${setting.data.hardAttribute ?? "none"}:${setting.data.nonDeterminingValues.join(",")}`}
      hardAttribute={setting.data.hardAttribute}
      nonDeterminingValues={setting.data.nonDeterminingValues}
      options={setting.data.options}
      isSaving={save.isPending}
      saveError={
        save.isError
          ? stillApplies(setting.data.hardAttribute, attributeLabels(setting.data.options))
          : undefined
      }
      onSave={(next) =>
        save.mutate(next, {
          onSuccess: () => toast.success("Pravidla ubytování byla uložena."),
        })
      }
    />
  )

  if (presentation === "dialog") return content

  return (
    <CollapsibleSection
      headingId={ACCOMMODATION_RULES_HEADING}
      title="Pravidla ubytování"
      alwaysOpen
    >
      {content}
    </CollapsibleSection>
  )
}
