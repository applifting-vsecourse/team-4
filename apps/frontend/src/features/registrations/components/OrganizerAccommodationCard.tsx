import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { readApiError } from "@/lib/apiError"

import { type RegistrationDetail } from "@/features/registrations/api/eventRegistrationSchemas"
import { type Gender } from "@/features/registrations/api/registrationSchemas"
import { AccommodationCard } from "@/features/registrations/components/AccommodationCard"
import { GenderField } from "@/features/registrations/components/GenderField"
import { useUpdateGender } from "@/features/registrations/hooks/useUpdateGender"

type OrganizerAccommodationCardProps = {
  organizationId: string
  eventId: string
  registration: Pick<RegistrationDetail, "id" | "gender" | "requiresManualAccommodation">
}

/** A refused or failed save; the stored answer stays and nothing reads as success. */
function describeError(error: unknown) {
  const apiError = readApiError(error)
  if (apiError.code === "change_pending" && apiError.message) return apiError.message
  if (apiError.status === 404) return "Přihláška už není dostupná. Údaj nebyl uložen."
  return "Údaj se nepodařilo uložit. Původní odpověď zůstává, zkuste to prosím znovu."
}

// Správa akce → Přihlášky → Detail přihlášky (F64): the participant's gender
// answer, the manual-accommodation notice and the organizer's correction.
export function OrganizerAccommodationCard({
  organizationId,
  eventId,
  registration,
}: OrganizerAccommodationCardProps) {
  const update = useUpdateGender(organizationId, eventId, registration.id)
  const [draft, setDraft] = useState<Gender | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const startEditing = () => {
    update.reset()
    setDraft(registration.gender)
    setIsEditing(true)
  }

  return (
    <AccommodationCard
      gender={registration.gender}
      isManualAccommodation={registration.requiresManualAccommodation}
      action={
        isEditing ? null : (
          <Button
            variant="outline"
            size="sm"
            onClick={startEditing}
          >
            Opravit
          </Button>
        )
      }
    >
      {isEditing ? (
        <form
          noValidate
          aria-label="Oprava pohlaví pro ubytování"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            update.mutate(draft, { onSuccess: () => setIsEditing(false) })
          }}
        >
          <GenderField
            id="organizer-gender"
            value={draft}
            onChange={setDraft}
            isDisabled={update.isPending}
          />
          {update.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{describeError(update.error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={() => setIsEditing(false)}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={update.isPending}
            >
              {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {update.isPending ? "Ukládám…" : "Uložit"}
            </Button>
          </div>
        </form>
      ) : undefined}
    </AccommodationCard>
  )
}
