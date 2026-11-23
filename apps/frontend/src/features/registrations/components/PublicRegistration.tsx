import { useEffect, useMemo, useRef, useState } from "react"

import { toE164 } from "@/lib/phone"

import type { FormQuestion } from "@/features/registrations/api/questionSchemas"
import { type SelectableTerm } from "@/features/registrations/api/registrationSchemas"
import { answersOf } from "@/features/registrations/components/QuestionAnswersFields"
import {
  RegistrationForm,
  type RegistrationFormValues,
} from "@/features/registrations/components/RegistrationForm"
import { RegistrationResult } from "@/features/registrations/components/RegistrationResult"
import { useSubmitRegistration } from "@/features/registrations/hooks/useSubmitRegistration"
import { toGenderAnswer } from "@/features/registrations/lib/gender"
import { clearDraft, readDraft, saveDraft } from "@/features/registrations/lib/registrationDraft"
import { describeRegistrationError } from "@/features/registrations/lib/registrationErrors"
import { normalizeNeeds } from "@/features/registrations/lib/registrationNeeds"

type PublicRegistrationProps = {
  publicId: string
  terms: SelectableTerm[]
  /** Participation terms of the event (F07); empty when it has none. */
  conditions: string
  /** The organizer's categorical questions (#485), in form order. */
  questions?: FormQuestion[]
  /** The version of those questions, sent back with the registration. */
  questionsVersion?: string
  /** Rooms are split by gender, so the gender answer is required. */
  isGenderRequired?: boolean
  /** A refusal said the questions changed since the form opened: read them again. */
  onQuestionsChanged?: () => void
  /**
   * Contact details of the signed-in participant's profile (S4-08). They only
   * prefill the form: it stays editable and saving it never changes the profile.
   */
  contact?: RegistrationContact | null
}

export type RegistrationContact = Pick<
  RegistrationFormValues,
  "firstName" | "lastName" | "email" | "phone"
>

// The form until the server confirms the save, then its stored result.
// One submission key per opened form: a retry after a lost response repeats
// the same submission and gets the saved result back instead of a duplicate.
// The typed values are kept for the tab until the registration is saved (F55).
export function PublicRegistration({
  publicId,
  terms,
  conditions,
  questions = [],
  questionsVersion,
  isGenderRequired = false,
  onQuestionsChanged,
  contact,
}: PublicRegistrationProps) {
  const [submissionKey] = useState(() => crypto.randomUUID())
  const [draft] = useState(() =>
    readDraft(
      publicId,
      terms.map((term) => term.id),
    ),
  )
  const submit = useSubmitRegistration(publicId)
  const resultHeading = useRef<HTMLDivElement>(null)
  const submitError = useMemo(
    () => (submit.error ? describeRegistrationError(submit.error) : null),
    [submit.error],
  )

  useEffect(() => {
    if (submitError?.kind === "questions") onQuestionsChanged?.()
  }, [submitError, onQuestionsChanged])

  useEffect(() => {
    if (!submit.data) return
    clearDraft(publicId)
    const heading = resultHeading.current?.querySelector<HTMLElement>("h2")
    heading?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [submit.data, publicId])

  if (submit.data) {
    return (
      <div ref={resultHeading}>
        <RegistrationResult result={submit.data} />
      </div>
    )
  }

  const onSubmit = (values: RegistrationFormValues) => {
    if (submit.isPending) return
    submit.mutate({
      submissionKey,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      // Validated by the form schema; the server normalizes the same way.
      phone: toE164(values.phone) ?? values.phone,
      termIds: values.termIds,
      needs: normalizeNeeds(values.needs),
      ...toGenderAnswer(values),
      conditionsConfirmed: values.conditionsConfirmed,
      answers: answersOf(questions, values.answers),
      ...(questionsVersion ? { questionsVersion } : {}),
    })
  }

  return (
    <RegistrationForm
      terms={terms}
      conditions={conditions}
      questions={questions}
      isGenderRequired={isGenderRequired}
      // A draft holds what was already typed, prefilled or not.
      initialValues={draft ?? contact}
      onValuesChange={(values) => saveDraft(publicId, values)}
      isSubmitting={submit.isPending}
      submitError={submitError}
      onSubmit={onSubmit}
    />
  )
}
