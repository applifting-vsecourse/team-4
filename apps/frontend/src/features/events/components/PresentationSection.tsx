import { useState } from "react"
import { toast } from "sonner"

import { readApiError } from "@/lib/apiError"

import { type EventDetail, type PresentationInput } from "@/features/events/api/eventSchemas"
import {
  EventPublicPresentation,
  MAX_PHOTO_BYTES,
  PHOTO_TYPES,
  toPresentationValues,
  type PresentationField,
} from "@/features/events/components/EventPublicPresentation"
import { useRefreshEvent } from "@/features/events/hooks/useEventMutations"
import {
  useAddPhoto,
  useOrganizerPhotoUrls,
  useRemovePhoto,
  useUpdatePresentation,
} from "@/features/events/hooks/useEventPresentation"

const FIELDS: PresentationField[] = [
  "description",
  "conditions",
  "contactName",
  "contactEmail",
  "contactPhone",
]

const PHOTO_TYPE_MESSAGE = "Nahrajte fotku ve formátu JPEG, PNG nebo WebP."
const PHOTO_SIZE_MESSAGE = "Fotka může mít nejvýše 5 MB."

type PresentationSectionProps = {
  organizationId: string
  event: EventDetail
}

// Card "Veřejná prezentace" of the event settings (F55): what the catalog
// detail shows. Stays editable after opening, except the description.
export function PresentationSection({ organizationId, event }: PresentationSectionProps) {
  const update = useUpdatePresentation(organizationId, event.id)
  const addPhoto = useAddPhoto(organizationId, event.id)
  const removePhoto = useRemovePhoto(organizationId, event.id)
  const refreshEvent = useRefreshEvent(organizationId, event.id)
  const photoIds = event.photos.map((photo) => photo.id)
  const photoUrls = useOrganizerPhotoUrls(organizationId, event.id, photoIds)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PresentationField, string>>>()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const handleSubmit = async (input: PresentationInput) => {
    setFieldErrors(undefined)
    setErrorMessage(null)
    try {
      await update.mutateAsync(input)
      toast.success("Veřejná prezentace byla uložena.")
    } catch (error) {
      const apiError = readApiError(error)
      const field = FIELDS.find((name) => name === apiError.field)
      if (field && apiError.message && (apiError.status === 400 || apiError.status === 409)) {
        setFieldErrors({ [field]: apiError.message })
        if (apiError.code === "event_locked") await refreshEvent()
      } else if (apiError.status === 404) {
        await refreshEvent()
        setErrorMessage("Záznam není dostupný.")
      } else {
        setErrorMessage("Veřejnou prezentaci se nepodařilo uložit. Zkuste to prosím znovu.")
      }
    }
  }

  const handleAddPhoto = async (file: File) => {
    setPhotoError(null)
    if (!PHOTO_TYPES.includes(file.type)) return setPhotoError(PHOTO_TYPE_MESSAGE)
    if (file.size > MAX_PHOTO_BYTES) return setPhotoError(PHOTO_SIZE_MESSAGE)
    try {
      await addPhoto.mutateAsync(file)
      toast.success("Fotka byla přidána.")
    } catch (error) {
      const apiError = readApiError(error)
      if (apiError.status === 413) setPhotoError(PHOTO_SIZE_MESSAGE)
      else if (apiError.code?.startsWith("photo_") && apiError.message) {
        setPhotoError(apiError.message)
        if (apiError.code === "photo_limit") await refreshEvent()
      } else if (apiError.status === 404) {
        await refreshEvent()
        setPhotoError("Záznam není dostupný.")
      } else setPhotoError("Fotku se nepodařilo nahrát. Zkuste to prosím znovu.")
    }
  }

  const handleRemovePhoto = async (photoId: string) => {
    setPhotoError(null)
    try {
      await removePhoto.mutateAsync(photoId)
      toast.success("Fotka byla odebrána.")
    } catch (error) {
      if (readApiError(error).status === 404) await refreshEvent()
      setPhotoError("Fotku se nepodařilo odebrat. Zkuste to prosím znovu.")
    }
  }

  return (
    <EventPublicPresentation
      initialValues={toPresentationValues(event)}
      isDescriptionLocked={event.isLocked}
      photos={photoIds.map((id, index) => ({
        id,
        alt: `Fotka ${index + 1} akce ${event.name}`,
        src: photoUrls[index],
      }))}
      fieldErrors={fieldErrors}
      isSaving={update.isPending}
      errorMessage={errorMessage}
      photoError={photoError}
      isUploading={addPhoto.isPending}
      removingPhotoId={removePhoto.isPending ? (removePhoto.variables ?? null) : null}
      onSubmit={handleSubmit}
      onAddPhoto={(file) => void handleAddPhoto(file)}
      onRemovePhoto={(photoId) => void handleRemovePhoto(photoId)}
    />
  )
}
