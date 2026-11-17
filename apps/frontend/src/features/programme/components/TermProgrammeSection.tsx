import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { formatCalendarRange } from "@/lib/date"

import { organizerProgrammeQueryOptions } from "@/features/programme/api/programmeQueryOptions"
import {
  type ProgrammeItemData,
  type ProgrammeItemInput,
} from "@/features/programme/api/programmeSchemas"
import { ProgrammeItemDialog } from "@/features/programme/components/ProgrammeItemDialog"
import { TermProgramme } from "@/features/programme/components/TermProgramme"
import {
  useDeleteProgrammeItem,
  useRefreshProgramme,
  useSaveProgrammeItem,
} from "@/features/programme/hooks/useProgrammeMutations"
import { groupByDay } from "@/features/programme/lib/programmeDays"
import { describeProgrammeError } from "@/features/programme/lib/programmeErrors"
import {
  type ProgrammeItemErrors,
  type ProgrammeItemValues,
} from "@/features/programme/lib/programmeInput"

const EMPTY_VALUES: ProgrammeItemValues = {
  title: "",
  date: "",
  time: "",
  place: "",
  description: "",
}

const toValues = (item: ProgrammeItemData): ProgrammeItemValues => ({
  title: item.title,
  date: item.startDate,
  time: item.startTime,
  place: item.place ?? "",
  description: item.description ?? "",
})

type TermProgrammeSectionProps = {
  organizationId: string
  eventId: string
  term: { id: string; label: string; startDate: string; endDate: string }
  /** Called after a saved change, so the item count on the event page reloads. */
  onChanged?: () => unknown
}

// Správa akce → Nastavení → Termíny a ceny → Program termínu (F65). The
// programme stays editable in a locked event: it is none of the locked fields.
export function TermProgrammeSection({
  organizationId,
  eventId,
  term,
  onChanged,
}: TermProgrammeSectionProps) {
  const scope = { organizationId, eventId, termId: term.id }
  const query = useQuery(organizerProgrammeQueryOptions(organizationId, eventId, term.id))
  const saveItem = useSaveProgrammeItem(scope)
  const deleteItem = useDeleteProgrammeItem(scope)
  const refresh = useRefreshProgramme(scope)

  // `undefined` is closed, `null` a new item.
  const [editing, setEditing] = useState<ProgrammeItemData | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<ProgrammeItemData | undefined>(undefined)
  const [fieldErrors, setFieldErrors] = useState<ProgrammeItemErrors>({})
  const [saveMessage, setSaveMessage] = useState<string>()
  const [deleteMessage, setDeleteMessage] = useState<string>()

  const items = query.data?.items ?? []
  const find = (itemId: string) => items.find((item) => item.id === itemId)

  const resetFailures = () => {
    setFieldErrors({})
    setSaveMessage(undefined)
    setDeleteMessage(undefined)
  }

  const handleSave = async (input: ProgrammeItemInput) => {
    resetFailures()
    try {
      await saveItem.mutateAsync({ itemId: editing?.id, input })
      toast.success(editing ? "Položka byla upravena." : "Položka byla přidána.")
      setEditing(undefined)
      await onChanged?.()
    } catch (error) {
      const described = describeProgrammeError(
        error,
        "Položku se nepodařilo uložit. Zkuste to prosím znovu.",
      )
      if (described.fieldError) setFieldErrors({ date: described.fieldError.message })
      setSaveMessage(described.errorMessage ?? undefined)
      if (described.shouldRefresh) await refresh()
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    resetFailures()
    try {
      await deleteItem.mutateAsync(deleting.id)
      toast.success("Položka byla odstraněna.")
      setDeleting(undefined)
      await onChanged?.()
    } catch (error) {
      const described = describeProgrammeError(
        error,
        "Položku se nepodařilo odstranit. Zkuste to prosím znovu.",
      )
      setDeleteMessage(described.errorMessage ?? undefined)
      if (described.shouldRefresh) await refresh()
    }
  }

  return (
    <>
      <TermProgramme
        days={groupByDay(items)}
        isLoadFailed={query.isError && !query.data}
        isLoading={query.isPending}
        isRetrying={query.isFetching}
        onAdd={() => {
          resetFailures()
          setEditing(null)
        }}
        onEdit={(itemId) => {
          resetFailures()
          setEditing(find(itemId))
        }}
        onDelete={(itemId) => {
          resetFailures()
          setDeleting(find(itemId))
        }}
        onRetry={() => query.refetch()}
      />
      <ProgrammeItemDialog
        isOpen={editing !== undefined}
        isEdit={Boolean(editing)}
        termLabel={`${term.label} (${formatCalendarRange(term.startDate, term.endDate)})`}
        termRange={term}
        values={editing ? toValues(editing) : EMPTY_VALUES}
        errors={fieldErrors}
        errorMessage={saveMessage}
        isSubmitting={saveItem.isPending}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditing(undefined)
        }}
        onSubmit={handleSave}
      />
      <ConfirmDeleteDialog
        isOpen={deleting !== undefined}
        title={`Odstranit položku „${deleting?.title ?? ""}“?`}
        consequence="Položka zmizí z programu termínu i u potvrzených účastníků."
        errorMessage={deleteMessage}
        isDeleting={deleteItem.isPending}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleting(undefined)
        }}
        onConfirm={handleDelete}
      />
    </>
  )
}
