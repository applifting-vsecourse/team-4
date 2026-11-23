import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Skeleton } from "@/components/ui/skeleton"
import { readApiError } from "@/lib/apiError"

import { eventQuestionsQueryOptions } from "@/features/registrations/api/questionQueryOptions"
import type { ManagedQuestion } from "@/features/registrations/api/questionSchemas"
import { RegistrationQuestionsSettings } from "@/features/registrations/components/RegistrationQuestionsSettings"
import { useSaveQuestions } from "@/features/registrations/hooks/useSaveQuestions"

/** Where a link to the questions of the form leads. */
export const REGISTRATION_QUESTIONS_HEADING = "registration-questions-heading"

const stillApplies = (questions: ManagedQuestion[]) =>
  questions.length
    ? `Platí dál otázky: ${questions.map((q) => q.label).join(", ")}.`
    : "Formulář dál nemá vlastní otázky."

// Nastavení → Otázky v přihlášce (#485): the saved questions of the form. A
// failed save keeps the edits and says which questions still apply; the
// server's reason comes first (an answered question, one the rules use).
export function RegistrationQuestionsSection({
  organizationId,
  eventId,
  invalidate,
}: {
  organizationId: string
  eventId: string
  /** Reloaded after a save: what lists the questions elsewhere. */
  invalidate?: readonly (readonly unknown[])[]
}) {
  const questions = useQuery(eventQuestionsQueryOptions(organizationId, eventId))
  const save = useSaveQuestions(organizationId, eventId, invalidate)
  // Only an own successful save starts the form again; a reload (after a
  // refused save, on focus) refreshes what protects a question and keeps the
  // organizer's edits.
  const [savedCount, setSavedCount] = useState(0)

  const content = questions.isPending ? (
    <LoadingBlock label="Načítání otázek přihlášky">
      <Skeleton className="h-40 w-full" />
    </LoadingBlock>
  ) : questions.isError ? (
    <LoadError
      title="Otázky přihlášky se nepodařilo načíst"
      isRetrying={questions.isFetching}
      onRetry={() => questions.refetch()}
    />
  ) : (
    <RegistrationQuestionsSettings
      key={savedCount}
      questions={questions.data}
      isSaving={save.isPending}
      saveError={
        save.isError
          ? [readApiError(save.error).message, stillApplies(questions.data)]
              .filter(Boolean)
              .join(" ")
          : undefined
      }
      onSave={(next) =>
        save.mutate(next, {
          onSuccess: () => {
            setSavedCount((count) => count + 1)
            toast.success("Otázky přihlášky byly uloženy.")
          },
          // Saved elsewhere meanwhile: the edits name questions that are gone,
          // so the form starts again on the list read now; the reason stays.
          onError: (error) => {
            if (readApiError(error).code === "questions_changed") {
              void questions.refetch().then(() => setSavedCount((count) => count + 1))
            }
          },
        })
      }
    />
  )

  return (
    <CollapsibleSection
      headingId={REGISTRATION_QUESTIONS_HEADING}
      title="Otázky v přihlášce"
    >
      {content}
    </CollapsibleSection>
  )
}
