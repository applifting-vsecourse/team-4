import { useState, type ReactNode } from "react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import { readApiError } from "@/lib/apiError"

import { type RegistrationDetail } from "@/features/registrations/api/eventRegistrationSchemas"
import { type GenderAnswer } from "@/features/registrations/api/registrationSchemas"
import { AccommodationCard } from "@/features/registrations/components/AccommodationCard"
import { GenderField } from "@/features/registrations/components/GenderField"
import { useUpdateGender } from "@/features/registrations/hooks/useUpdateGender"
import { NO_GENDER_ANSWER } from "@/features/registrations/lib/gender"

type OrganizerAccommodationCardProps = {
  organizationId: string
  eventId: string
  registration: Pick<
    RegistrationDetail,
    "id" | "gender" | "genderOther" | "requiresManualAccommodation"
  >
  /** Below the answer while it is not edited: the determination (S3-01), from another feature. */
  determination?: ReactNode
  /** A saved answer changes the term evaluation of another feature (S3-01). */
  onAnswerSaved?: () => void
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
  determination,
  onAnswerSaved,
}: OrganizerAccommodationCardProps) {
  const update = useUpdateGender(organizationId, eventId, registration.id)
  const stored: GenderAnswer = {
    gender: registration.gender,
    genderOther: registration.genderOther,
  }
  const [draft, setDraft] = useState<GenderAnswer>(NO_GENDER_ANSWER)
  const [isEditing, setIsEditing] = useState(false)

  const startEditing = () => {
    update.reset()
    setDraft(stored)
    setIsEditing(true)
  }

  return (
    <AccommodationCard
      answer={stored}
      isManualAccommodation={registration.requiresManualAccommodation}
      extra={isEditing ? undefined : determination}
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
            update.mutate(draft, {
              onSuccess: () => {
                setIsEditing(false)
                onAnswerSaved?.()
              },
            })
          }}
        >
          <GenderField
            id="organizer-gender"
            value={draft}
            onChange={setDraft}
            isDisabled={update.isPending}
          />
          {update.isError ? <FormError message={describeError(update.error)} /> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={() => setIsEditing(false)}
            >
              Zrušit
            </Button>
            <PendingButton
              type="submit"
              isPending={update.isPending}
            >
              {update.isPending ? "Ukládám…" : "Uložit"}
            </PendingButton>
          </div>
        </form>
      ) : undefined}
    </AccommodationCard>
  )
}
