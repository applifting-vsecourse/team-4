import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { RecordUnavailable } from "@/components/RecordUnavailable"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { participantRegistrationQueryOptions } from "@/features/registrations/api/participantRegistrationQueryOptions"
import { type ParticipantRegistrationDetail } from "@/features/registrations/api/participantRegistrationSchemas"
import { type ChangeProposal } from "@/features/registrations/api/registrationChangeSchemas"
import { ChangeReviewDialog } from "@/features/registrations/components/ChangeReviewDialog"
import { LoadFailedAlert } from "@/features/registrations/components/LoadFailedAlert"
import {
  RegistrationChangeForm,
  type ChangeableTerm,
  type ContactErrors,
} from "@/features/registrations/components/RegistrationChangeForm"
import {
  buildProposal,
  validateContact,
  type EditState,
} from "@/features/registrations/lib/changeProposal"
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
  "Nic jste nezměnili. Upravte údaje nebo pohlaví pro ubytování, přesuňte termín nebo se z něj odhlaste."

// Moje přihlášky → Detail přihlášky → Úprava přihlášky (F35-2a): personal and
// contact data in the scope of the registration form (not the e-mail), a move
// to another term of the same event, and cancelling single terms.
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
      <Button
        variant="ghost"
        size="sm"
        asChild
      >
        <Link
          to={ROUTES.myRegistration}
          params={{ registrationId }}
        >
          <ChevronLeft />
          Detail přihlášky
        </Link>
      </Button>

      {query.isError ? (
        <LoadFailedAlert
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        <>
          <div className="space-y-2">
            <h1 className="text-h2">Úprava přihlášky</h1>
            <p className="text-sm text-muted-foreground">{data.event.name}</p>
          </div>
          {data.canChange ? (
            // A reloaded registration (new version) starts a fresh form.
            <EditForm
              key={data.version}
              registration={data}
              onReload={() => void query.refetch()}
              onLeave={onLeave}
            />
          ) : (
            <Alert>
              <AlertDescription>
                {data.isCancelled
                  ? "Přihláška je odhlášená, úpravy nejsou dostupné."
                  : "Žádost o změnu čeká na schválení organizátora. Dokud není vyřízená, nelze přihlášku dál měnit."}
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : query.isPending ? (
        <div
          className="space-y-4"
          role="status"
          aria-label="Načítání přihlášky"
        >
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
        </div>
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
  const { contact, terms, availableTerms } = registration
  const active = useMemo(() => terms.filter((term) => term.status !== "cancelled"), [terms])

  const initial = useMemo<EditState>(
    () => ({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      gender: contact.gender,
      genderOther: contact.genderOther,
      terms: Object.fromEntries(
        active.map((term) => [term.termId, { selectedTermId: term.termId, isCancelled: false }]),
      ),
    }),
    [contact, active],
  )
  const [state, setState] = useState(initial)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [message, setMessage] = useState<string>()
  const [proposal, setProposal] = useState<ChangeProposal | null>(null)

  const formTerms = useMemo<ChangeableTerm[]>(
    () =>
      active.map((term) => ({
        id: term.termId,
        label: term.label,
        details: `${formatCalendarRange(term.startDate, term.endDate)} · ${formatCzk(term.priceMinor)}`,
        status: term.status,
        selectedTermId: term.termId,
        options: [
          {
            id: term.termId,
            label: `${term.label} · ${formatCalendarRange(term.startDate, term.endDate)} · ${formatCzk(term.priceMinor)}`,
          },
          ...availableTerms
            .filter((other) => !active.some((own) => own.termId === other.termId))
            .map((other) => ({
              id: other.termId,
              label: `${other.label} · ${formatCalendarRange(other.startDate, other.endDate)} · ${formatCzk(other.priceMinor)}${other.isFull ? " · obsazeno" : ""}`,
            })),
        ],
      })),
    [active, availableTerms],
  )

  const review = () => {
    const contactErrors = validateContact(state)
    setErrors(contactErrors)
    if (Object.keys(contactErrors).length > 0) {
      setMessage(undefined)
      return
    }
    const next = buildProposal(contact, state)
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
        errors={errors}
        errorMessage={message}
        onContactChange={(field, value) => setState((current) => ({ ...current, [field]: value }))}
        onGenderChange={(answer) => setState((current) => ({ ...current, ...answer }))}
        onTermChange={(termId, change) =>
          setState((current) => ({ ...current, terms: { ...current.terms, [termId]: change } }))
        }
        onReview={review}
        onCancel={onLeave}
      />
      {proposal ? (
        <ChangeReviewDialog
          registrationId={registration.id}
          proposal={proposal}
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
