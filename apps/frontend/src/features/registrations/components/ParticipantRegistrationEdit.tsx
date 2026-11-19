import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Notice } from "@/components/Notice"
import { PageHeader } from "@/components/PageHeader"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { participantRegistrationQueryOptions } from "@/features/registrations/api/participantRegistrationQueryOptions"
import { type ParticipantRegistrationDetail } from "@/features/registrations/api/participantRegistrationSchemas"
import { type ChangeProposal } from "@/features/registrations/api/registrationChangeSchemas"
import { ChangeReviewDialog } from "@/features/registrations/components/ChangeReviewDialog"
import {
  RegistrationChangeForm,
  type ContactErrors,
  type FormTerm,
} from "@/features/registrations/components/RegistrationChangeForm"
import {
  buildProposal,
  validateContact,
  type EditState,
} from "@/features/registrations/lib/changeProposal"
import {
  validateNeeds,
  type RegistrationNeedsErrors,
} from "@/features/registrations/lib/registrationNeeds"
import {
  isRegistrationUnavailable,
  isSessionRefused,
} from "@/features/registrations/lib/sessionExpired"

type ParticipantRegistrationEditProps = {
  registrationId: string
  sessionEnded: React.ReactNode
  /** Leaves the form: after a change, a request or "Zrušit". */
  onLeave: () => void
}

const NOTHING_CHANGED =
  "Nic jste nezměnili. Upravte údaje nebo pohlaví pro ubytování, přidejte termín nebo se z termínu odhlaste."

// Moje přihlášky → Detail přihlášky → Úprava přihlášky (F35-2a): personal and
// contact data in the scope of the registration form (not the e-mail), one
// list of the event's terms to add or cancel terms (F35-2c), and transport,
// diet and health (F63).
export function ParticipantRegistrationEdit({
  registrationId,
  sessionEnded,
  onLeave,
}: ParticipantRegistrationEditProps) {
  const query = useQuery(participantRegistrationQueryOptions(registrationId))
  const { data } = query

  if (query.isError && isSessionRefused(query.error)) return sessionEnded
  if (query.isError && isRegistrationUnavailable(query.error)) {
    return (
      <RecordUnavailable
        action={
          <Button
            variant="outline"
            asChild
          >
            <Link to={ROUTES.myRegistrations}>Zpět na moje přihlášky</Link>
          </Button>
        }
      />
    )
  }

  return (
    <section className="space-y-6">
      <BackLink
        to={ROUTES.myRegistration}
        params={{ registrationId }}
      >
        Detail přihlášky
      </BackLink>

      {query.isError ? (
        <LoadError
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        <>
          <PageHeader
            title="Úprava přihlášky"
            description={data.event.name}
          />
          {data.canChange ? (
            // A reloaded registration (new version) starts a fresh form.
            <EditForm
              key={data.version}
              registration={data}
              onReload={() => void query.refetch()}
              onLeave={onLeave}
            />
          ) : (
            <Notice
              tone="info"
              title={
                data.isCancelled
                  ? "Přihláška je odhlášená, úpravy nejsou dostupné."
                  : "Žádost o změnu čeká na schválení organizátora. Dokud není vyřízená, nelze přihlášku dál měnit."
              }
            />
          )}
        </>
      ) : query.isPending ? (
        <LoadingBlock
          label="Načítání přihlášky"
          className="space-y-4"
        >
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
        </LoadingBlock>
      ) : null}
    </section>
  )
}

type EditFormProps = {
  registration: ParticipantRegistrationDetail
  onReload: () => void
  onLeave: () => void
}

function EditForm({ registration, onReload, onLeave }: EditFormProps) {
  const { contact, needs, terms, availableTerms } = registration
  const active = useMemo(() => terms.filter((term) => term.status !== "cancelled"), [terms])

  const heldTermIds = useMemo(() => active.map((term) => term.termId), [active])
  const initial = useMemo<EditState>(
    () => ({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      needs,
      gender: contact.gender,
      genderOther: contact.genderOther,
      selectedTermIds: heldTermIds,
    }),
    [contact, needs, heldTermIds],
  )
  const [state, setState] = useState(initial)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [needsErrors, setNeedsErrors] = useState<RegistrationNeedsErrors>({})
  const [message, setMessage] = useState<string>()
  const [proposal, setProposal] = useState<ChangeProposal | null>(null)

  // Every term of the event in one list by start; the held ones carry their participation.
  const formTerms = useMemo<FormTerm[]>(() => {
    const held = new Map(active.map((term) => [term.termId, term]))
    const all = [
      ...availableTerms,
      ...active.filter((own) => !availableTerms.some((other) => other.termId === own.termId)),
    ].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.termId.localeCompare(b.termId))
    return all.map((term) => ({
      id: term.termId,
      label: term.label,
      details: `${formatCalendarRange(term.startDate, term.endDate)} · ${formatCzk(held.get(term.termId)?.priceMinor ?? term.priceMinor)}`,
      status: held.get(term.termId)?.status ?? null,
    }))
  }, [active, availableTerms])

  const review = () => {
    const contactErrors = validateContact(state)
    const invalidNeeds = validateNeeds(state.needs)
    setErrors(contactErrors)
    setNeedsErrors(invalidNeeds)
    if (Object.keys(contactErrors).length + Object.keys(invalidNeeds).length > 0) {
      setMessage(undefined)
      return
    }
    const next = buildProposal({ ...contact, needs, heldTermIds }, state)
    if (!next) {
      setMessage(NOTHING_CHANGED)
      return
    }
    setMessage(undefined)
    setProposal(next)
  }

  return (
    <>
      <RegistrationChangeForm
        contact={contact}
        terms={formTerms}
        needs={needs}
        errors={errors}
        needsErrors={needsErrors}
        errorMessage={message}
        onContactChange={(field, value) => setState((current) => ({ ...current, [field]: value }))}
        onNeedsChange={(next) => setState((current) => ({ ...current, needs: next }))}
        onGenderChange={(answer) => setState((current) => ({ ...current, ...answer }))}
        onSelectedTermsChange={(selectedTermIds) =>
          setState((current) => ({ ...current, selectedTermIds }))
        }
        onReview={review}
        onCancel={onLeave}
      />
      {proposal ? (
        <ChangeReviewDialog
          registrationId={registration.id}
          proposal={proposal}
          heldTerms={active}
          onClose={() => setProposal(null)}
          onDone={onLeave}
          onReload={() => {
            setProposal(null)
            onReload()
          }}
        />
      ) : null}
    </>
  )
}
