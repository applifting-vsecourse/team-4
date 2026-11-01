import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { ProgrammeList, type ProgrammeDay } from "@/features/programme/components/ProgrammeList"
import { ProgrammeLoadFailed } from "@/features/programme/components/ProgrammeLoadFailed"

export type ParticipantProgrammeTerm = {
  id: string
  label: string
  /** Formatted range, e.g. "6. 11. – 8. 11. 2026". */
  dates: string
  status: "confirmed" | "waitlisted"
  days: ProgrammeDay[]
  /** The programme of this term could not be loaded. */
  isLoadFailed?: boolean
}

// Moje přihlášky → Detail přihlášky → Program termínu (F65), participant.
// One card per term of the registration. A waitlisted term shows only an
// explanation, never its content. Design only: every value is passed in.
export function ParticipantProgramme({ terms }: { terms: ParticipantProgrammeTerm[] }) {
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
              <Badge variant={term.status === "confirmed" ? "success" : "warning"}>
                {term.status === "confirmed" ? "Potvrzeno" : "Náhradník"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {term.status === "waitlisted" ? (
              <Alert>
                <AlertDescription>
                  Program je dostupný až po potvrzení účasti v tomto termínu.
                </AlertDescription>
              </Alert>
            ) : term.isLoadFailed ? (
              <ProgrammeLoadFailed />
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
