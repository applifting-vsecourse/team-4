import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  DIET_LABELS,
  TRANSPORT_LABELS,
  type RegistrationNeedsValues,
} from "@/features/registrations/components/RegistrationNeedsFields"

export type RegistrationNeedsSummaryProps = {
  values: RegistrationNeedsValues
}

const NOT_PROVIDED = "Neuvedeno"

// Detail přihlášky, participant and organizer (F63): the stored transport,
// diet and health data. Empty values read "Neuvedeno", never "Bez omezení".
// Design only: every value is passed in.
export function RegistrationNeedsSummary({ values }: RegistrationNeedsSummaryProps) {
  const hasDiet = values.hasNoDietRestriction || values.diet.length > 0 || values.dietNote !== ""

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doprava, strava a zdraví</CardTitle>
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
                          <Badge variant="secondary">Bez omezení</Badge>
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
