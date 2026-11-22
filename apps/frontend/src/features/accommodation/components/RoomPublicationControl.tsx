import { LoadingBlock } from "@/components/LoadingBlock"
import { Field, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

import { type RoomPublication } from "@/features/accommodation/api/publicationSchemas"

type RoomPublicationControlProps = {
  /** Undefined while the first state loads. */
  publication: RoomPublication | undefined
  /** The state shown belongs to the previous term until the new one arrives. */
  isSwitching?: boolean
  isSaving?: boolean
  onChange: (isPublished: boolean) => unknown
}

// Správa akce → Ubytování → Rozdělení do pokojů (S4-02): a switch for whether
// the participants of the selected term see their rooms. It shows the saved
// state only, so a failed change leaves it where it was and a second click
// retries. A failed load is reported by the section, never as unpublished.
export function RoomPublicationControl({
  publication,
  isSwitching = false,
  isSaving = false,
  onChange,
}: RoomPublicationControlProps) {
  if (!publication) {
    return (
      <LoadingBlock label="Načítání stavu zveřejnění">
        <Skeleton className="h-6 w-48" />
      </LoadingBlock>
    )
  }
  return (
    <Field
      orientation="horizontal"
      className="w-auto"
    >
      <Switch
        id="room-publication"
        checked={publication.isPublished}
        disabled={isSwitching || isSaving}
        onCheckedChange={onChange}
      />
      <FieldLabel htmlFor="room-publication">Zveřejnit rozdělení</FieldLabel>
    </Field>
  )
}
