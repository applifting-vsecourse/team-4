import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { Notice } from "@/components/Notice"

import type { StatementImport } from "@/features/payments/api/paymentSchemas"

// The result of one import and of the pairing after it (F24). An empty
// statement still says how many transactions it brought: none.
export function StatementImportResult({ result }: { result: StatementImport }) {
  const isEmpty = result.received === 0
  return (
    <Notice
      tone={isEmpty ? "info" : "success"}
      role="status"
      title={isEmpty ? "Výpis neobsahuje žádné přijaté platby" : "Výpis byl naimportován"}
    >
      <DefinitionList className="mt-2 max-w-sm">
        <DefinitionRow label="Nové transakce">
          <span className="font-mono tabular-nums">{result.imported}</span>
        </DefinitionRow>
        <DefinitionRow label="Spárováno podle variabilního symbolu">
          <span className="font-mono tabular-nums">{result.paired}</span>
        </DefinitionRow>
        {result.duplicates > 0 ? (
          <DefinitionRow label="Již dříve naimportované">
            <span className="font-mono tabular-nums">{result.duplicates}</span>
          </DefinitionRow>
        ) : null}
        {result.skippedOutgoing > 0 ? (
          <DefinitionRow label="Přeskočené odchozí platby">
            <span className="font-mono tabular-nums">{result.skippedOutgoing}</span>
          </DefinitionRow>
        ) : null}
      </DefinitionList>
    </Notice>
  )
}
