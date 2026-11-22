import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Notice } from "@/components/Notice"
import { ParticipationBadge } from "@/components/ParticipationBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { type TermParticipation } from "@/lib/participation"

import { ProgrammeList, type ProgrammeDay } from "@/features/programme/components/ProgrammeList"

export type ParticipantProgrammeTerm = {
  id: string
  label: string
  /** Formatted range, e.g. "6. 11. – 8. 11. 2026". */
  dates: string
  status: Exclude<TermParticipation, "cancelled">
  days: ProgrammeDay[]
  /** The programme of this term could not be loaded. */
  isLoadFailed?: boolean
  isRetrying?: boolean
  /** The programme is still being read. */
  isLoading?: boolean
}

// Moje přihlášky → Detail přihlášky → Program termínu (F65), participant.
// One card per term of the registration. An unconfirmed term shows only an
// explanation, never its content. Every value is passed in.
type ParticipantProgrammeProps = {
  terms: ParticipantProgrammeTerm[]
  onRetry?: (termId: string) => void
}

export function ParticipantProgramme({ terms, onRetry }: ParticipantProgrammeProps) {
  const [openTerms, setOpenTerms] = useState<Record<string, boolean>>({})

  return (
    <div className="space-y-6">
      {terms.map((term) => (
        <Card key={term.id}>
          <Collapsible
            open={openTerms[term.id] ?? false}
            onOpenChange={(isOpen) =>
              setOpenTerms((current) => ({ ...current, [term.id]: isOpen }))
            }
          >
            <div className="px-6">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="group h-auto min-h-16 w-full justify-between text-left whitespace-normal"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90 motion-reduce:transition-none"
                    />
                    <span className="min-w-0 space-y-1">
                      <span
                        role="heading"
                        aria-level={2}
                        className="block text-h4 wrap-break-word"
                      >
                        Program – {term.label}
                      </span>
                      <span className="block text-sm font-normal text-muted-foreground">
                        {term.dates}
                      </span>
                    </span>
                  </span>
                  <ParticipationBadge status={term.status} />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-6">
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
                  <ProgrammeList
                    days={term.days}
                    initialOpenDayId={term.days.find((day) => day.items.length > 0)?.id}
                  />
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  )
}
