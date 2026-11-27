import { Link } from "@tanstack/react-router"

import { ROUTES, SECTIONS } from "@/app/routes"
import { PageSection } from "@/components/PageSection"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { MealNote } from "@/features/meals/api/mealSchemas"

type MealNotesProps = { organizationId: string; eventId: string; notes: MealNote[] }

// Vlastní poznámky ke stravě with the participant. They are the participant's
// own words, so they are not counted as a diet, and they are not printed. The
// button opens the registration on its Potřeby tab, at the diet.
export function MealNotes({ organizationId, eventId, notes }: MealNotesProps) {
  return (
    <PageSection title="Poznámky ke stravě">
      <ul className="divide-y divide-border rounded-lg border md:hidden">
        {notes.map((note) => (
          <li
            key={note.registrationId}
            className="space-y-2 px-4 py-3 text-sm"
          >
            <p className="font-medium">
              {note.firstName} {note.lastName}
            </p>
            <p className="wrap-break-word">{note.note}</p>
            <ShowRegistration
              organizationId={organizationId}
              eventId={eventId}
              note={note}
            />
          </li>
        ))}
      </ul>
      <Card className="hidden md:block">
        <div className="-my-6">
          <Table containerLabel="Tabulka poznámek ke stravě">
            <TableHeader>
              <TableRow>
                <TableHead>Účastník</TableHead>
                <TableHead>Poznámka</TableHead>
                <TableHead>
                  <span className="sr-only">Přihláška</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.registrationId}>
                  <TableCell>
                    <span className="font-medium">
                      {note.firstName} {note.lastName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block min-w-48 whitespace-normal">{note.note}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <ShowRegistration
                      organizationId={organizationId}
                      eventId={eventId}
                      note={note}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </PageSection>
  )
}

type ShowRegistrationProps = { organizationId: string; eventId: string; note: MealNote }

function ShowRegistration({ organizationId, eventId, note }: ShowRegistrationProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
    >
      <Link
        to={ROUTES.registration}
        params={{ organizationId, eventId, registrationId: note.registrationId }}
        search={{ tab: "needs" }}
        hash={SECTIONS.registrationDiet}
        aria-label={`Zobrazit přihlášku: ${note.firstName} ${note.lastName}`}
      >
        Zobrazit přihlášku
      </Link>
    </Button>
  )
}
