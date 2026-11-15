import { useQuery } from "@tanstack/react-query"
import { Check, X } from "lucide-react"

import { FormError } from "@/components/FormError"
import { LoadError } from "@/components/LoadError"
import { Notice } from "@/components/Notice"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { readApiError } from "@/lib/apiError"

import { registrationChangesQueryOptions } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { ChangeRequestCard } from "@/features/registrations/components/ChangeRequestCard"
import { RegistrationHistory } from "@/features/registrations/components/RegistrationHistory"
import { useDecideChange } from "@/features/registrations/hooks/useRegistrationChange"
import {
  describeHistoryEntry,
  describeKinds,
  formatChangeTime,
  toSummaryProps,
} from "@/features/registrations/lib/changeSummary"

type RegistrationChangeDecisionProps = {
  organizationId: string
  eventId: string
  registrationId: string
}

const DECISION_FAILED = "Rozhodnutí se nepodařilo uložit. Zkuste to prosím znovu."

// Správa akce → Přihlášky → Detail přihlášky (F35-2a): the unresolved request that
// needed the organizer with its original and proposed values, the decision, and
// the history of changes. The valid registration stays below until approval.
export function RegistrationChangeDecision({
  organizationId,
  eventId,
  registrationId,
}: RegistrationChangeDecisionProps) {
  const query = useQuery(registrationChangesQueryOptions(organizationId, eventId, registrationId))
  const decide = useDecideChange(organizationId, eventId, registrationId)
  const changes = query.data ?? []
  // Only an unresolved request is shown on top; a decided one is history only.
  const shown = changes.find((change) => change.status === "pending")
  const failure = decide.isError ? readApiError(decide.error) : null
  // A legacy move without the participant's consent can never be approved.
  const isConsentMissing = failure?.code === "release_consent_required"

  return (
    <div className="space-y-6">
      {query.isError ? (
        <LoadError
          title="Změny přihlášky se nepodařilo načíst"
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {shown ? (
        <ChangeRequestCard
          status="pending"
          kind={describeKinds(shown.kinds)}
          submittedAt={formatChangeTime(shown.createdAt)}
          summary={toSummaryProps(shown.summary)}
          notice={
            shown.isStale ? (
              <Notice
                tone="warning"
                title="Přihláška se po odeslání žádosti změnila, žádost proto nelze schválit. Můžete ji zamítnout a účastník ji podá znovu."
              />
            ) : failure ? (
              <FormError
                message={
                  failure.code === "change_already_decided"
                    ? "O žádosti už bylo rozhodnuto jinak. Načtěte stránku znovu."
                    : isConsentMissing
                      ? "Účastník nesouhlasil se ztrátou potvrzeného místa. Žádost lze jen zamítnout."
                      : failure.code === "change_invalid"
                        ? (failure.message ?? DECISION_FAILED)
                        : DECISION_FAILED
                }
              />
            ) : undefined
          }
          actions={
            <>
              <Button
                variant="outline"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ changeId: shown.id, decision: "reject" })}
              >
                <X />
                Zamítnout
              </Button>
              <Button
                disabled={decide.isPending || shown.isStale || isConsentMissing}
                onClick={() => decide.mutate({ changeId: shown.id, decision: "approve" })}
              >
                <Check />
                Schválit
              </Button>
            </>
          }
        />
      ) : null}

      {changes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Historie změn</CardTitle>
          </CardHeader>
          <CardContent>
            <RegistrationHistory
              entries={changes.map((change) => ({
                id: change.id,
                at: formatChangeTime(change.decidedAt ?? change.createdAt),
                text: describeHistoryEntry(change),
              }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
