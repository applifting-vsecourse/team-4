import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  QueueHistoryList,
  type QueueHistoryListProps,
} from "@/features/accommodation/components/QueueHistoryList"

// Správa akce → Přihlášky → detail přihlášky → Pořadí a rozhodnutí (F39-1):
// the history entries that concern this one registration, across its terms.
// Design only: every value is passed in.
export function QueueHistoryRegistrationCard(props: QueueHistoryListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-h4">Pořadí a rozhodnutí</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <QueueHistoryList {...props} />
      </CardContent>
    </Card>
  )
}
