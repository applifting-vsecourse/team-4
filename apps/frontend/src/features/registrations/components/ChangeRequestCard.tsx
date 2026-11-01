import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChangeSummary,
  type ChangeSummaryProps,
} from "@/features/registrations/components/ChangeSummary"

export type ChangeRequestStatus = "pending" | "approved" | "rejected"

const STATUS: Record<
  ChangeRequestStatus,
  { label: string; variant: "secondary" | "success" | "destructive-subtle" }
> = {
  pending: { label: "Čeká na schválení", variant: "secondary" },
  approved: { label: "Schváleno", variant: "success" },
  rejected: { label: "Zamítnuto", variant: "destructive-subtle" },
}

export type ChangeRequestCardProps = {
  status: ChangeRequestStatus
  /** What the participant asks for, e.g. "Přesun termínu". */
  kind: string
  /** Already formatted, e.g. "30. 10. 2026 14:05". */
  submittedAt: string
  /** When the organizer approved or rejected it, already formatted. */
  decidedAt?: string
  summary: ChangeSummaryProps
  /** Alerts above the summary, e.g. a failed decision. */
  notice?: ReactNode
  /** The organizer's decision buttons. */
  actions?: ReactNode
}

// A participant's change request awaiting or after the organizer's decision
// (F35-2a): Moje přihlášky → Detail přihlášky, and Správa akce → Přihlášky →
// Ke schválení → Detail přihlášky. Until approval, the valid registration
// stays as it is. Design only: every value is passed in.
export function ChangeRequestCard({
  status,
  kind,
  submittedAt,
  decidedAt,
  summary,
  notice,
  actions,
}: ChangeRequestCardProps) {
  const { label, variant } = STATUS[status]

  return (
    <Card>
      <CardHeader>
        <CardTitle
          role="heading"
          aria-level={2}
        >
          Žádost o změnu
        </CardTitle>
        <CardAction>
          <Badge variant={variant}>{label}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <dl className="space-y-2 text-sm">
            <Row label="Změna">{kind}</Row>
            <Row label="Odesláno">{submittedAt}</Row>
            {decidedAt ? (
              <Row label={status === "approved" ? "Schváleno" : "Zamítnuto"}>{decidedAt}</Row>
            ) : null}
          </dl>
          {notice}
          <ChangeSummary {...summary} />
        </div>
      </CardContent>
      {actions ? (
        <CardFooter className="justify-end">
          <div className="flex flex-wrap gap-2">{actions}</div>
        </CardFooter>
      ) : null}
    </Card>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
