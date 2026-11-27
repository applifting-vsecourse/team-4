import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageSection } from "@/components/PageSection"
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
// own words, so they are not counted as a diet, and they are not printed.
export function MealNotes({ organizationId, eventId, notes }: MealNotesProps) {
  return (
    <PageSection title="Poznámky ke stravě">
      <Card>
        <div className="-my-6">
          <Table containerLabel="Tabulka poznámek ke stravě">
            <TableHeader>
              <TableRow>
                <TableHead>Účastník</TableHead>
                <TableHead>Poznámka</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.registrationId}>
                  <TableCell className="align-top">
                    <Link
                      to={ROUTES.registration}
                      params={{ organizationId, eventId, registrationId: note.registrationId }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {note.firstName} {note.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="block min-w-48 whitespace-normal">{note.note}</span>
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
