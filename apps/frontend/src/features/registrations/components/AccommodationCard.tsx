import type { ReactNode } from "react"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { Notice } from "@/components/Notice"
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
            <DefinitionList layout="stacked">
              <DefinitionRow label="Pohlaví pro ubytování">
                {genderText(answer.gender)}
              </DefinitionRow>
              {answer.genderOther ? (
                <DefinitionRow label="Vlastní odpověď">{answer.genderOther}</DefinitionRow>
              ) : null}
            </DefinitionList>
          )}
          {extra}
          {isManualAccommodation ? (
            <Notice
              tone="warning"
              title="Ubytování je potřeba určit ručně"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
