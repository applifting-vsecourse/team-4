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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { participantRegistrationQueryOptions } from "@/features/registrations/api/participantRegistrationQueryOptions"
import { type ParticipantRegistrationDetail } from "@/features/registrations/api/participantRegistrationSchemas"
import { type ChangeProposal } from "@/features/registrations/api/registrationChangeSchemas"
import { AccommodationCard } from "@/features/registrations/components/AccommodationCard"
import { ChangeReviewDialog } from "@/features/registrations/components/ChangeReviewDialog"
import {
  missingAnswers,
  type AnswerValues,
} from "@/features/registrations/components/QuestionAnswersFields"
import {
  RegistrationChangeForm,
  type ContactErrors,
  type FormTerm,
} from "@/features/registrations/components/RegistrationChangeForm"
import { GENDER_REQUIRED } from "@/features/registrations/components/RegistrationForm"
import { RegistrationTermStates } from "@/features/registrations/components/RegistrationTermStates"
import { RoommateWishesCard } from "@/features/registrations/components/RoommateWishesCard"
import {
  buildProposal,
  isCancellationOnly,
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
  // An asked-for reload starts the form again; a background one keeps the edits.
  const [reloads, setReloads] = useState(0)

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
            title="Správa přihlášky"
            description={data.event.name}
          />
          {data.canChange ? (
            // A new version or an asked-for reload starts a fresh form.
            <EditForm
              key={`${data.version}-${reloads}`}
              registration={data}
              hasConfirmedTerm={data.terms.some((term) => term.status === "confirmed")}
              onReload={() => void query.refetch().then(() => setReloads((n) => n + 1))}
              onLeave={onLeave}
            />
          ) : data.isCancelled ? (
            <Notice
              tone="info"
              title="Přihláška je odhlášená, úpravy nejsou dostupné."
            />
          ) : (
            <div className="space-y-6">
              <Notice
                tone="info"
                title="Žádost o změnu čeká na schválení organizátora. Dokud není vyřízená, nelze přihlášku dál měnit."
              />
              <Card>
                <CardHeader>
                  <CardTitle>Termíny</CardTitle>
                </CardHeader>
                <CardContent>
                  <RegistrationTermStates
                    terms={data.terms.map((term) => ({
                      id: term.termId,
                      label: term.label,
                      details: `${formatCalendarRange(term.startDate, term.endDate)} · ${formatCzk(term.priceMinor)}`,
                      state: term.status,
                    }))}
                  />
                </CardContent>
              </Card>
              <AccommodationCard
                answer={data.contact}
                extra={
                  data.terms.some((term) => term.status === "confirmed") ? (
                    <RoommateWishesSection registrationId={registrationId} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Spolubydlící si můžete vybrat po potvrzení účasti.
                    </p>
                  )
                }
              />
            </div>
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
  hasConfirmedTerm: boolean
  onReload: () => void
  onLeave: () => void
}

function EditForm({ registration, hasConfirmedTerm, onReload, onLeave }: EditFormProps) {
  const { contact, needs, terms, availableTerms, questions } = registration
  const currentAnswers = useMemo<AnswerValues>(
    () =>
      Object.fromEntries(
        registration.answers.map((answer) => [answer.questionId, answer.optionId]),
      ),
    [registration.answers],
  )
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
      answers: currentAnswers,
    }),
    [contact, needs, heldTermIds, currentAnswers],
  )
  const [state, setState] = useState(initial)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [needsErrors, setNeedsErrors] = useState<RegistrationNeedsErrors>({})
  const [answerErrors, setAnswerErrors] = useState<Partial<Record<string, string>>>({})
  const [genderError, setGenderError] = useState<string>()
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

  // Answered before the rule, or never: asked for before other changes.
  const isGenderMissing = registration.isGenderRequired && contact.gender === null

  const review = () => {
    const contactErrors = validateContact(state)
    const invalidNeeds = validateNeeds(state.needs)
    const next = buildProposal({ ...contact, needs, heldTermIds, answers: currentAnswers }, state)
    // A required question comes first, also one added after the registration,
    // except for a cancellation alone, which is always possible (#485).
    const unanswered =
      next && isCancellationOnly(next)
        ? {}
        : Object.fromEntries(
            missingAnswers(questions, state.answers).map((question) => [
              question.id,
              "Vyberte odpověď.",
            ]),
          )
    setErrors(contactErrors)
    setNeedsErrors(invalidNeeds)
    // Rooms are split by gender: it needs an answer, except to cancel alone.
    const missingGender =
      registration.isGenderRequired && state.gender === null && !(next && isCancellationOnly(next))
        ? GENDER_REQUIRED
        : undefined
    setAnswerErrors(unanswered)
    setGenderError(missingGender)
    if (
      Object.keys(contactErrors).length +
        Object.keys(invalidNeeds).length +
        Object.keys(unanswered).length >
        0 ||
      missingGender
    ) {
      setMessage(undefined)
      return
    }
    if (!next) {
      setMessage(NOTHING_CHANGED)
      return
    }
    setMessage(undefined)
    // Against the questions shown: changed meanwhile, the server refuses it.
    setProposal({ ...next, questionsVersion: registration.questionsVersion })
  }

  return (
    <>
      {registration.missingAnswers.length > 0 || isGenderMissing ? (
        <Notice
          tone="warning"
          title="Přihláška potřebuje doplnit odpověď"
        >
          {isGenderMissing
            ? "Pokoje se dělí podle pohlaví, vyberte ho v části Osobní a kontaktní údaje. "
            : null}
          {registration.missingAnswers.length > 0
            ? "Odpovězte na povinnou otázku v části Otázky pořadatele. "
            : null}
          Do té doby lze přihlášku jen odhlásit, jiné změny uložit nelze.
        </Notice>
      ) : null}
      <RegistrationChangeForm
        contact={contact}
        questions={questions}
        answers={currentAnswers}
        answerErrors={answerErrors}
        isGenderRequired={registration.isGenderRequired}
        genderError={genderError}
        onAnswersChange={(answers) => setState((current) => ({ ...current, answers }))}
        terms={formTerms}
        needs={needs}
        errors={errors}
        needsErrors={needsErrors}
        errorMessage={message}
        onContactChange={(field, value) => setState((current) => ({ ...current, [field]: value }))}
        onNeedsChange={(next) => setState((current) => ({ ...current, needs: next }))}
        onGenderChange={(answer) => setState((current) => ({ ...current, ...answer }))}
        accommodationContent={
          hasConfirmedTerm ? (
            <RoommateWishesSection registrationId={registration.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Spolubydlící si můžete vybrat po potvrzení účasti.
            </p>
          )
        }
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

function RoommateWishesSection({ registrationId }: { registrationId: string }) {
  return (
    <section
      aria-label="Přání na spolubydlící"
      className="space-y-3 border-t border-border pt-4"
    >
      <RoommateWishesCard registrationId={registrationId} />
    </section>
  )
}
