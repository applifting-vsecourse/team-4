import type { ReactNode } from "react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { type GenderAnswer } from "@/features/registrations/api/registrationSchemas"
import { genderText } from "@/features/registrations/lib/gender"

type AccommodationCardProps = {
  answer: GenderAnswer
  /** Organizer only: the answer does not decide the accommodation. */
  isManualAccommodation?: boolean
  /** E.g. the organizer's "Opravit". */
  action?: ReactNode
  /** Replaces the stored answer while it is being edited. */
  children?: ReactNode
  /** Below the answer, e.g. the organizer's determination of the accommodation (S3-01). */
  extra?: ReactNode
}

// F64, Detail přihlášky (participant and organizer): the stored gender answer
// for accommodation and the own words for "Jiná odpověď". No answer reads
// "Neuvedeno", apart from "Nechci uvést".
export function AccommodationCard({
  answer,
  isManualAccommodation = false,
  action,
  children,
  extra,
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
            <dl className="space-y-3 text-sm">
              <div className="space-y-1">
                <dt className="text-muted-foreground">Pohlaví pro ubytování</dt>
                <dd>{genderText(answer.gender)}</dd>
              </div>
              {answer.genderOther ? (
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Vlastní odpověď</dt>
                  <dd className="break-words">{answer.genderOther}</dd>
                </div>
              ) : null}
            </dl>
          )}
          {extra}
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
