import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Notice } from "@/components/Notice"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { ProgrammeList, type ProgrammeDay } from "@/features/programme/components/ProgrammeList"

export type ParticipantProgrammeTerm = {
  id: string
  label: string
  /** Formatted range, e.g. "6. 11. – 8. 11. 2026". */
  dates: string
  status: "pending" | "confirmed" | "waitlisted"
  days: ProgrammeDay[]
  /** The programme of this term could not be loaded. */
  isLoadFailed?: boolean
  isRetrying?: boolean
  /** The programme is still being read. */
  isLoading?: boolean
}

const STATUS_BADGE: Record<
  ParticipantProgrammeTerm["status"],
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  pending: { label: "Čeká na rozhodnutí organizátora", variant: "secondary" },
  confirmed: { label: "Potvrzeno", variant: "success" },
  waitlisted: { label: "Náhradník", variant: "warning" },
}

// Moje přihlášky → Detail přihlášky → Program termínu (F65), participant.
// One card per term of the registration. An unconfirmed term shows only an
// explanation, never its content. Every value is passed in.
type ParticipantProgrammeProps = {
  terms: ParticipantProgrammeTerm[]
  onRetry?: (termId: string) => void
}

export function ParticipantProgramme({ terms, onRetry }: ParticipantProgrammeProps) {
  return (
    <div className="space-y-6">
      {terms.map((term) => (
        <Card key={term.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <h2 className="text-h4 wrap-break-word">Program – {term.label}</h2>
                <p className="text-sm text-muted-foreground">{term.dates}</p>
              </div>
              <Badge variant={STATUS_BADGE[term.status].variant}>
                {STATUS_BADGE[term.status].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {term.status !== "confirmed" ? (
              <Notice
                tone="info"
                title="Program je dostupný až po potvrzení účasti v tomto termínu."
              />
            ) : term.isLoading ? (
              <LoadingBlock label="Načítání programu">
                <Skeleton className="h-24 w-full" />
              </LoadingBlock>
            ) : term.isLoadFailed ? (
              <LoadError
                title="Program se nepodařilo načíst"
                onRetry={() => onRetry?.(term.id)}
                isRetrying={term.isRetrying}
              />
            ) : term.days.length === 0 ? (
              <p className="text-sm">Program zatím není připravený.</p>
            ) : (
              <ProgrammeList days={term.days} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
