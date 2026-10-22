import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

import { type Participant } from "@/features/participant-access/api/participantSchemas"

// The signed-in frame of "Moje přihlášky" (Figma M2): the e-mail and the title.
// The list of registrations, its refresh and the empty state belong to S2-14
// (#93) and replace the placeholder below.
export function MyRegistrationsShell({ participant }: { participant: Participant }) {
  return (
    <div className="space-y-4">
      <p className="text-sm wrap-break-word text-muted-foreground">{participant.email}</p>
      <h1 className="text-h2">Moje přihlášky</h1>

      <Empty>
        <EmptyHeader>
          <EmptyTitle>Přehled přihlášek se připravuje</EmptyTitle>
          <EmptyDescription>
            Vaše přihlášky tu brzy uvidíte i se stavem účasti a platbami.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
