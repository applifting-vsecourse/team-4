import { LoadingBlock } from "@/components/LoadingBlock"
import { PendingButton } from "@/components/PendingButton"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import { type RoomPublication } from "@/features/accommodation/api/publicationSchemas"

type RoomPublicationControlProps = {
  /** Undefined while the first state loads. */
  publication: RoomPublication | undefined
  /** The state shown belongs to the previous term until the new one arrives. */
  isSwitching?: boolean
  isSaving?: boolean
  onChange: (isPublished: boolean) => unknown
}

// Správa akce → Ubytování → Rozdělení do pokojů (S4-02): whether the
// participants of the selected term see their rooms, and the action that
// changes it. A failed load is reported by the section, never as
// "Nezveřejněno".
export function RoomPublicationControl({
  publication,
  isSwitching = false,
  isSaving = false,
  onChange,
}: RoomPublicationControlProps) {
  if (!publication) {
    return (
      <LoadingBlock label="Načítání stavu zveřejnění">
        <Skeleton className="h-8 w-56" />
      </LoadingBlock>
    )
  }
  const { isPublished } = publication
  return (
    <>
      <Badge variant={isPublished ? "success" : "secondary"}>
        {isPublished ? "Zveřejněno" : "Nezveřejněno"}
      </Badge>
      <PendingButton
        type="button"
        variant="outline"
        size="sm"
        isPending={isSaving}
        disabled={isSwitching}
        onClick={() => onChange(!isPublished)}
      >
        {isPublished ? "Zrušit zveřejnění" : "Zveřejnit rozdělení"}
      </PendingButton>
    </>
  )
}
