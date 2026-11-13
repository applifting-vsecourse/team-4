import { CalendarClock, Plus } from "lucide-react"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

import { ProgrammeList, type ProgrammeDay } from "@/features/programme/components/ProgrammeList"

type TermProgrammeProps = {
  days: ProgrammeDay[]
  /** The programme could not be loaded; the list is not shown as empty. */
  isLoadFailed?: boolean
  /** The first load is running; the list is not shown as empty. */
  isLoading?: boolean
  isRetrying?: boolean
  onAdd?: () => void
  onEdit?: (itemId: string) => void
  onDelete?: (itemId: string) => void
  onRetry?: () => void
}

// Správa akce → Nastavení → Termíny a ceny → Program termínu (F65), organizer.
// Every value and action is passed in.
export function TermProgramme({
  days,
  isLoadFailed = false,
  isLoading = false,
  isRetrying,
  onAdd,
  onEdit,
  onDelete,
  onRetry,
}: TermProgrammeProps) {
  const addButton = (
    <Button
      variant={days.length === 0 ? "default" : "outline"}
      onClick={onAdd}
    >
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
        {!isLoadFailed && !isLoading && days.length > 0 ? addButton : null}
      </div>

      {isLoadFailed ? (
        <LoadError
          title="Program se nepodařilo načíst"
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : isLoading ? (
        <LoadingBlock
          label="Načítání programu"
          className="space-y-2"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </LoadingBlock>
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
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </CardContent>
        </Card>
      )}
    </section>
  )
}
