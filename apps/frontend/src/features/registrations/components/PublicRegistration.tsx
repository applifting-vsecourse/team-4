import { useEffect, useMemo, useRef, useState } from "react"

import { toE164 } from "@/lib/phone"

import { type SelectableTerm } from "@/features/registrations/api/registrationSchemas"
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
}

// The form until the server confirms the save, then its stored result.
// One submission key per opened form: a retry after a lost response repeats
// the same submission and gets the saved result back instead of a duplicate.
// The typed values are kept for the tab until the registration is saved (F55).
export function PublicRegistration({ publicId, terms }: PublicRegistrationProps) {
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
    })
  }

  return (
    <RegistrationForm
      terms={terms}
      initialValues={draft}
      onValuesChange={(values) => saveDraft(publicId, values)}
      isSubmitting={submit.isPending}
      submitError={submitError}
      onSubmit={onSubmit}
    />
  )
}
