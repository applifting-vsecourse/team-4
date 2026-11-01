export type HistoryEntry = {
  id: string
  /** Already formatted, e.g. "30. 10. 2026 14:05". */
  at: string
  /** E.g. "Odhlášení z termínů Turnus 1 a Turnus 2 schváleno". */
  text: string
}

// Moje přihlášky → Detail přihlášky → Historie změn (F35-2a): the executed,
// approved and rejected changes of the registration, newest first.
// Design only: every value is passed in.
export function RegistrationHistory({ entries }: { entries: HistoryEntry[] }) {
  return (
    <ul className="divide-y divide-border text-sm">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
        >
          <span>{entry.text}</span>
          <span className="text-muted-foreground">{entry.at}</span>
        </li>
      ))}
    </ul>
  )
}
