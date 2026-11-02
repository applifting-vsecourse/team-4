import { CalendarClock, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

import { ProgrammeList, type ProgrammeDay } from "@/features/programme/components/ProgrammeList"
import { ProgrammeLoadFailed } from "@/features/programme/components/ProgrammeLoadFailed"

type TermProgrammeProps = {
  days: ProgrammeDay[]
  /** The programme could not be loaded; the list is not shown as empty. */
  isLoadFailed?: boolean
}

// Správa akce → Nastavení → Termíny a ceny → Program termínu (F65), organizer.
// Design only: every value is passed in.
export function TermProgramme({ days, isLoadFailed = false }: TermProgrammeProps) {
  const addButton = (
    <Button variant={days.length === 0 ? "default" : "outline"}>
      <Plus />
      Přidat položku
    </Button>
  )

  return (
    <section aria-labelledby="programme-heading">
      <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
        <h2
          id="programme-heading"
          className="text-h4"
        >
          Program termínu
        </h2>
        {!isLoadFailed && days.length > 0 ? addButton : null}
      </div>

      {isLoadFailed ? (
        <ProgrammeLoadFailed />
      ) : days.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarClock />
            </EmptyMedia>
            <EmptyTitle>Program zatím nemá žádné položky</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>{addButton}</EmptyContent>
        </Empty>
      ) : (
        <Card>
          <CardContent>
            <ProgrammeList
              days={days}
              isEditable
            />
          </CardContent>
        </Card>
      )}
    </section>
  )
}
