import { Link } from "@tanstack/react-router"
import { CalendarCog, ListChecks, Pencil, Plus, Trash2 } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBeds } from "@/lib/beds"
import { formatCalendarRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type EventDetail } from "@/features/events/api/eventSchemas"
import { DeleteTermDialog } from "@/features/events/components/DeleteTermDialog"
import { TermDialog } from "@/features/events/components/TermDialog"

// "Bez položek", "1 položka", "4 položky", "8 položek".
function formatProgrammeItems(count: number) {
  if (count === 0) return "Bez položek"
  if (count === 1) return "1 položka"
  return count < 5 ? `${count} položky` : `${count} položek`
}

type TermsSectionProps = {
  organizationId: string
  event: EventDetail
}

// Terms of one event. A locked event shows its terms read-only.
export function TermsSection({ organizationId, event }: TermsSectionProps) {
  const canEdit = !event.isLocked

  const addButton = (
    <TermDialog
      organizationId={organizationId}
      eventId={event.id}
      allTerms={event.terms}
      trigger={
        <Button variant={event.terms.length === 0 ? "default" : "outline"}>
          <Plus />
          Přidat termín
        </Button>
      }
    />
  )

  return (
    <section aria-labelledby="terms-heading">
      <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
        <h2
          id="terms-heading"
          className="text-h4"
        >
          Termíny a ceny
        </h2>
        {canEdit && event.terms.length > 0 ? addButton : null}
      </div>

      {event.terms.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarCog />
            </EmptyMedia>
            <EmptyTitle>Zatím žádné termíny</EmptyTitle>
          </EmptyHeader>
          {canEdit ? <EmptyContent>{addButton}</EmptyContent> : null}
        </Empty>
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Označení</TableHead>
                <TableHead>Termín</TableHead>
                <TableHead>Cena</TableHead>
                <TableHead>Kapacita</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>
                  <span className="sr-only">Akce</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {event.terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.label}</TableCell>
                  <TableCell>{formatCalendarRange(term.startDate, term.endDate)}</TableCell>
                  <TableCell>{formatCzk(term.priceMinor)}</TableCell>
                  <TableCell>{formatBeds(term.capacity)}</TableCell>
                  <TableCell>{formatProgrammeItems(term.programmeItemCount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Program termínu ${term.label}`}
                        asChild
                      >
                        <Link
                          to={ROUTES.termProgramme}
                          params={{ organizationId, eventId: event.id, termId: term.id }}
                        >
                          <ListChecks />
                          Program
                        </Link>
                      </Button>
                      {canEdit ? (
                        <>
                          <TermDialog
                            organizationId={organizationId}
                            eventId={event.id}
                            term={term}
                            allTerms={event.terms}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Upravit termín ${term.label}`}
                              >
                                <Pencil />
                              </Button>
                            }
                          />
                          <DeleteTermDialog
                            organizationId={organizationId}
                            eventId={event.id}
                            term={term}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Odstranit termín ${term.label}`}
                              >
                                <Trash2 />
                              </Button>
                            }
                          />
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  )
}
