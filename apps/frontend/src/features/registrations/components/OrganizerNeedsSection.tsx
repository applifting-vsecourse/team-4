import { useState } from "react"
import { Loader2, Pencil } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { readApiError } from "@/lib/apiError"

import { type RegistrationDetail } from "@/features/registrations/api/eventRegistrationSchemas"
import { RegistrationNeedsFields } from "@/features/registrations/components/RegistrationNeedsFields"
import { RegistrationNeedsSummary } from "@/features/registrations/components/RegistrationNeedsSummary"
import { useCorrectNeeds } from "@/features/registrations/hooks/useCorrectNeeds"
import {
  normalizeNeeds,
  validateNeeds,
  type RegistrationNeedsErrors,
} from "@/features/registrations/lib/registrationNeeds"

const SAVE_FAILED = "Údaje se nepodařilo uložit. Zůstaly zachované, zkuste to prosím znovu."

const CHANGE_PENDING =
  "Přihláška má nevyřízenou žádost o změnu. Nejdřív o ní rozhodněte, údaje zůstaly zachované."

type OrganizerNeedsSectionProps = {
  organizationId: string
  eventId: string
  registration: Pick<RegistrationDetail, "id" | "needs" | "version">
  /** Reloads the registration, after it changed while the organizer was editing. */
  onReload: () => unknown
}

// Správa akce → Přihlášky → Detail účastníka (F63): the stored transport, diet
// and health data, and the organizer's correction of exactly these fields. It
// is saved at once, without approval, on the version the editing started from.
export function OrganizerNeedsSection({
  organizationId,
  eventId,
  registration,
  onReload,
}: OrganizerNeedsSectionProps) {
  const [editing, setEditing] = useState<{ version: number } | null>(null)

  if (!editing) {
    return (
      <RegistrationNeedsSummary
        values={registration.needs}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing({ version: registration.version })}
          >
            <Pencil />
            Upravit
          </Button>
        }
      />
    )
  }

  return (
    <NeedsEditor
      organizationId={organizationId}
      eventId={eventId}
      registration={{ ...registration, version: editing.version }}
      onDone={() => setEditing(null)}
      onReload={() => {
        setEditing(null)
        void onReload()
      }}
    />
  )
}

type NeedsEditorProps = Omit<OrganizerNeedsSectionProps, "onReload"> & {
  onDone: () => void
  onReload: () => void
}

function NeedsEditor({
  organizationId,
  eventId,
  registration,
  onDone,
  onReload,
}: NeedsEditorProps) {
  const correct = useCorrectNeeds(organizationId, eventId, registration.id)
  const [draft, setDraft] = useState(registration.needs)
  const [errors, setErrors] = useState<RegistrationNeedsErrors>({})
  const apiError = correct.isError ? readApiError(correct.error) : null
  const isStale = apiError?.code === "registration_stale"

  const save = () => {
    const invalid = validateNeeds(draft)
    setErrors(invalid)
    if (Object.keys(invalid).length > 0 || correct.isPending) return
    correct.mutate(
      { expectedVersion: registration.version, needs: normalizeNeeds(draft) },
      { onSuccess: onDone },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doprava, strava a zdraví</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          aria-label="Úprava dopravy, stravy a zdraví"
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <RegistrationNeedsFields
            defaultValue={registration.needs}
            onChange={setDraft}
            errors={errors}
          />
          {isStale ? (
            <Alert variant="destructive">
              <AlertDescription>
                <p>Přihláška se mezitím změnila. Načtěte aktuální údaje a opravu proveďte znovu.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={onReload}
                >
                  Načíst aktuální údaje
                </Button>
              </AlertDescription>
            </Alert>
          ) : correct.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {apiError?.code === "change_pending" ? CHANGE_PENDING : SAVE_FAILED}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={correct.isPending || isStale}
            >
              {correct.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {correct.isPending ? "Ukládám…" : "Uložit údaje"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onDone}
              disabled={correct.isPending}
            >
              Zrušit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
