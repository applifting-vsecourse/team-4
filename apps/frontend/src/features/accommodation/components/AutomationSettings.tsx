import { useRef, useState } from "react"
import { toast } from "sonner"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Card, CardContent } from "@/components/ui/card"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"

import type { EvaluationMode } from "@/features/accommodation/api/evaluationSchemas"

type AutomationSettingsProps = {
  evaluationMode: EvaluationMode
  roomProposalMode: EvaluationMode
  saveEvaluationMode: (mode: EvaluationMode) => Promise<unknown>
  saveRoomProposalMode: (mode: EvaluationMode) => Promise<unknown>
}

const saveFailure = "Původní režim platí dál. Změna zůstala ve formuláři; můžete ji uložit znovu."

export function AutomationSettings({
  evaluationMode,
  roomProposalMode,
  saveEvaluationMode,
  saveRoomProposalMode,
}: AutomationSettingsProps) {
  const [selectedEvaluation, setSelectedEvaluation] = useState(evaluationMode)
  const [selectedRooms, setSelectedRooms] = useState(roomProposalMode)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{ evaluation?: string; rooms?: string }>({})
  const saving = useRef(false)

  const isEvaluationChanged = selectedEvaluation !== evaluationMode
  const isRoomsChanged = selectedRooms !== roomProposalMode

  const save = async () => {
    if (saving.current || (!isEvaluationChanged && !isRoomsChanged)) return
    saving.current = true
    setIsSaving(true)
    setErrors({})

    const changed: {
      key: "evaluation" | "rooms"
      save: () => Promise<unknown>
      onSuccess: () => void
    }[] = []
    if (isEvaluationChanged) {
      changed.push({
        key: "evaluation",
        save: () => saveEvaluationMode(selectedEvaluation),
        onSuccess: () => setSelectedEvaluation(selectedEvaluation),
      })
    }
    if (isRoomsChanged) {
      changed.push({
        key: "rooms",
        save: () => saveRoomProposalMode(selectedRooms),
        onSuccess: () => setSelectedRooms(selectedRooms),
      })
    }

    const results = await Promise.allSettled(changed.map(({ save: saveMode }) => saveMode()))
    const nextErrors: { evaluation?: string; rooms?: string } = {}
    results.forEach((result, index) => {
      const item = changed[index]
      if (!item) return
      if (result.status === "fulfilled") item.onSuccess()
      else nextErrors[item.key] = saveFailure
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) {
      toast.success("Automatizace byla uložena.")
    } else {
      toast.error("Některé změny automatizace se nepodařilo uložit.")
    }
    saving.current = false
    setIsSaving(false)
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <FieldLabel htmlFor="automation-evaluation">
                Automaticky vyhodnocovat účast
              </FieldLabel>
              <FieldDescription>Po změně podkladů přepočítá návrh, koho přijmout.</FieldDescription>
            </div>
            <Switch
              id="automation-evaluation"
              checked={selectedEvaluation === "automatic"}
              onCheckedChange={(isChecked) => {
                setSelectedEvaluation(isChecked ? "automatic" : "manual")
                setErrors((current) => ({ ...current, evaluation: undefined }))
              }}
              aria-label="Automaticky vyhodnocovat účast"
            />
          </div>
          {errors.evaluation ? (
            <FormError
              title="Automatické vyhodnocování účasti se nepodařilo uložit"
              message={errors.evaluation}
            />
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <FieldLabel htmlFor="automation-rooms">Automaticky navrhovat pokoje</FieldLabel>
              <FieldDescription>
                Po změně podkladů vytvoří nový návrh rozdělení pokojů.
              </FieldDescription>
            </div>
            <Switch
              id="automation-rooms"
              checked={selectedRooms === "automatic"}
              onCheckedChange={(isChecked) => {
                setSelectedRooms(isChecked ? "automatic" : "manual")
                setErrors((current) => ({ ...current, rooms: undefined }))
              }}
              aria-label="Automaticky navrhovat pokoje"
            />
          </div>
          {errors.rooms ? (
            <FormError
              title="Automatické navrhování pokojů se nepodařilo uložit"
              message={errors.rooms}
            />
          ) : null}
          <p className="text-sm text-muted-foreground">
            Potvrzení účasti a použití návrhu pokojů provádíte vy.
          </p>
          <div className="flex justify-end">
            <PendingButton
              isPending={isSaving}
              disabled={!isEvaluationChanged && !isRoomsChanged}
              onClick={save}
            >
              Uložit automatizaci
            </PendingButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
