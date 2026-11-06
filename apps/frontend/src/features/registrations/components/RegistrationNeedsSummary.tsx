import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { type RegistrationNeeds } from "@/features/registrations/api/registrationSchemas"
import {
  DIET_LABELS,
  NO_DIET_RESTRICTION,
  NOT_PROVIDED,
  TRANSPORT_LABELS,
} from "@/features/registrations/lib/registrationNeeds"

export type RegistrationNeedsSummaryProps = {
  values: RegistrationNeeds
  /** E.g. the organizer's "Upravit". */
  action?: ReactNode
}

// Detail přihlášky, participant and organizer (F63): the stored transport,
// diet and health data. Empty values read "Neuvedeno", never "Bez omezení".
export function RegistrationNeedsSummary({ values, action }: RegistrationNeedsSummaryProps) {
  const hasDiet = values.hasNoDietRestriction || values.diet.length > 0 || values.dietNote !== ""

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doprava, strava a zdraví</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        <dl className="space-y-4 text-sm">
          <div className="space-y-1">
            <dt className="text-muted-foreground">Doprava</dt>
            <dd>
              {values.transport || values.transportNote ? (
                <div className="space-y-1">
                  {values.transport ? <p>{TRANSPORT_LABELS[values.transport]}</p> : null}
                  {values.transportNote ? (
                    <p className="wrap-break-word">{values.transportNote}</p>
                  ) : null}
                </div>
              ) : (
                NOT_PROVIDED
              )}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Strava</dt>
            <dd>
              {hasDiet ? (
                <div className="space-y-2">
                  {values.hasNoDietRestriction || values.diet.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {values.hasNoDietRestriction ? (
                        <li>
                          <Badge variant="secondary">{NO_DIET_RESTRICTION}</Badge>
                        </li>
                      ) : null}
                      {values.diet.map((choice) => (
                        <li key={choice}>
                          <Badge variant="secondary">{DIET_LABELS[choice]}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {values.dietNote ? <p className="wrap-break-word">{values.dietNote}</p> : null}
                </div>
              ) : (
                NOT_PROVIDED
              )}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Zdravotní omezení</dt>
            <dd className="wrap-break-word whitespace-pre-line">{values.health || NOT_PROVIDED}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
