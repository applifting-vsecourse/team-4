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
import { ProgrammeCalendar } from "@/features/programme/components/ProgrammeCalendar"
import { ProgrammeItemDialog } from "@/features/programme/components/ProgrammeItemDialog"
import {
  useDeleteProgrammeItem,
  useRefreshProgramme,
  useSaveProgrammeItem,
} from "@/features/programme/hooks/useProgrammeMutations"
import { termCalendar } from "@/features/programme/lib/programmeDays"
import { describeProgrammeError } from "@/features/programme/lib/programmeErrors"
import {
  type ProgrammeItemErrors,
  type ProgrammeItemValues,
} from "@/features/programme/lib/programmeInput"

const emptyValues = (date: string): ProgrammeItemValues => ({
  title: "",
  date,
  time: "",
  endTime: "",
  place: "",
  description: "",
})

const toValues = (item: ProgrammeItemData): ProgrammeItemValues => ({
  title: item.title,
  date: item.startDate,
  time: item.startTime,
  endTime: item.endTime,
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

// Správa akce → Program (F65-1): the calendar of the selected term's days. The
// programme stays editable in a locked event: it is none of the locked fields.
// The parent keys this component by term, so every term starts with its own
// open days and dialogs.
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

  // `undefined` is closed; a new item has only the day it was added on.
  const [editing, setEditing] = useState<{ item: ProgrammeItemData } | { day: string } | undefined>(
    undefined,
  )
  const [deleting, setDeleting] = useState<ProgrammeItemData | undefined>(undefined)
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<ProgrammeItemErrors>({})
  const [saveMessage, setSaveMessage] = useState<string>()
  const [deleteMessage, setDeleteMessage] = useState<string>()

  const items = query.data?.items ?? []
  const find = (itemId: string) => items.find((item) => item.id === itemId)
  const editedItem = editing && "item" in editing ? editing.item : undefined
  const newItemDay = editing && "day" in editing ? editing.day : ""

  const resetFailures = () => {
    setFieldErrors({})
    setSaveMessage(undefined)
    setDeleteMessage(undefined)
  }

  const handleSave = async (input: ProgrammeItemInput) => {
    resetFailures()
    try {
      await saveItem.mutateAsync({ itemId: editedItem?.id, input })
      toast.success(editedItem ? "Položka byla upravena." : "Položka byla přidána.")
      // Land where the result is visible: the day the item is on.
      setOpenDays((current) => ({ ...current, [input.startDate]: true }))
      setEditing(undefined)
    } catch (error) {
      const described = describeProgrammeError(
        error,
        "Položku se nepodařilo uložit. Zkuste to prosím znovu.",
      )
      if (described.fieldError) {
        setFieldErrors({ [described.fieldError.field]: described.fieldError.message })
      }
      setSaveMessage(described.errorMessage ?? undefined)
      if (described.shouldRefresh) await refresh()
      return
    }
    // The saved change stands even when reloading the item count fails.
    await onChanged?.()
  }

  const handleDelete = async () => {
    if (!deleting) return
    resetFailures()
    try {
      await deleteItem.mutateAsync(deleting.id)
      toast.success("Položka byla odstraněna.")
      setDeleting(undefined)
      setEditing(undefined)
    } catch (error) {
      const described = describeProgrammeError(
        error,
        "Položku se nepodařilo odstranit. Zkuste to prosím znovu.",
      )
      setDeleteMessage(described.errorMessage ?? undefined)
      if (described.shouldRefresh) await refresh()
      return
    }
    await onChanged?.()
  }

  return (
    <>
      <ProgrammeCalendar
        days={termCalendar(term, items)}
        openOverrides={openDays}
        isLoadFailed={query.isError && !query.data}
        isLoading={query.isPending}
        isRetrying={query.isFetching}
        onToggleDay={(dayId, isOpen) => setOpenDays((current) => ({ ...current, [dayId]: isOpen }))}
        onAdd={(day) => {
          resetFailures()
          setEditing({ day })
        }}
        onEdit={(itemId) => {
          resetFailures()
          const item = find(itemId)
          if (item) setEditing({ item })
        }}
        onRetry={() => query.refetch()}
      />
      <ProgrammeItemDialog
        isOpen={editing !== undefined}
        isEdit={Boolean(editedItem)}
        termLabel={`${term.label} (${formatCalendarRange(term.startDate, term.endDate)})`}
        termRange={term}
        values={editedItem ? toValues(editedItem) : emptyValues(newItemDay)}
        errors={fieldErrors}
        errorMessage={saveMessage}
        isSubmitting={saveItem.isPending}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditing(undefined)
        }}
        onSubmit={handleSave}
        onDelete={() => {
          resetFailures()
          setDeleting(editedItem)
        }}
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
