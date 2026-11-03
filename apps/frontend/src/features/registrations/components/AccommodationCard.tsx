import type { ReactNode } from "react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { type Gender } from "@/features/registrations/api/registrationSchemas"
import { genderText } from "@/features/registrations/lib/gender"

type AccommodationCardProps = {
  gender: Gender | null
  /** Organizer only: the answer does not decide the accommodation. */
  isManualAccommodation?: boolean
  /** E.g. the organizer's "Opravit". */
  action?: ReactNode
  /** Replaces the stored answer while it is being edited. */
  children?: ReactNode
}

// F64, Detail přihlášky (participant and organizer): the stored gender answer
// for accommodation. No answer reads "Neuvedeno", apart from "Nechci uvést".
export function AccommodationCard({
  gender,
  isManualAccommodation = false,
  action,
  children,
}: AccommodationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubytování</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {children ?? (
            <dl className="space-y-1 text-sm">
              <dt className="text-muted-foreground">Pohlaví pro ubytování</dt>
              <dd>{genderText(gender)}</dd>
            </dl>
          )}
          {isManualAccommodation ? (
            <Alert>
              <AlertTitle>Ubytování je potřeba určit ručně</AlertTitle>
            </Alert>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
