import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Landmark } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { FormError } from "@/components/FormError"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageSection } from "@/components/PageSection"
import { Skeleton } from "@/components/ui/skeleton"
import { readApiError } from "@/lib/apiError"

import { bankTransactionsQueryOptions } from "@/features/payments/api/paymentQueryOptions"
import { BankTransactionsTable } from "@/features/payments/components/BankTransactionsTable"
import { StatementImportButton } from "@/features/payments/components/StatementImportButton"
import { StatementImportResult } from "@/features/payments/components/StatementImportResult"
import { useStatementImport } from "@/features/payments/hooks/useStatementImport"

const MAX_STATEMENT_BYTES = 2 * 1024 * 1024
const TOO_LARGE = "Výpis může mít nejvýše 2 MB."
const FAILED = "Výpis se nepodařilo naimportovat. Zkuste to prosím znovu."
const FILE_ERRORS = new Set(["statement_format", "statement_invalid", "statement_too_large"])

/** The server's message for a refused file; a generic one for a lost request. */
export const importErrorMessage = (error: unknown): string => {
  const { status, code, message } = readApiError(error)
  if (status === 413) return TOO_LARGE
  return message && code && FILE_ERRORS.has(code) ? message : FAILED
}

type BankTransactionsSectionProps = {
  organizationId: string
  eventId: string
  /** Only when a link points at the import (`#…`). */
  headingId?: string
  /** An import or a pairing may have added payments to registrations. */
  onPaymentsChanged?: () => void
}

// Správa akce → Platby: the import of a bank statement (F23) and the queue of
// transactions it could not pair by variable symbol, each to be paired with a
// registration by hand (F24). Paired transactions are received payments.
export function BankTransactionsSection({
  organizationId,
  eventId,
  headingId,
  onPaymentsChanged,
}: BankTransactionsSectionProps) {
  const transactions = useQuery(bankTransactionsQueryOptions(organizationId, eventId))
  const statementImport = useStatementImport(organizationId, eventId, onPaymentsChanged)
  const [fileError, setFileError] = useState<string | null>(null)

  const importFile = (file: File) => {
    statementImport.reset()
    if (file.size > MAX_STATEMENT_BYTES) {
      setFileError(TOO_LARGE)
      return
    }
    setFileError(null)
    statementImport.mutate(file)
  }

  const error =
    fileError ?? (statementImport.isError ? importErrorMessage(statementImport.error) : null)

  return (
    <PageSection
      title="Nespárované transakce"
      headingId={headingId}
      isBusy={transactions.isFetching && !transactions.isPending}
      actions={
        <StatementImportButton
          isPending={statementImport.isPending}
          onSelect={importFile}
        />
      }
    >
      <div className="space-y-4">
        {error ? (
          <FormError
            title="Výpis nebyl naimportován"
            message={error}
          />
        ) : null}
        {statementImport.data ? <StatementImportResult result={statementImport.data} /> : null}

        {transactions.isPending ? (
          <LoadingBlock
            label="Načítání transakcí"
            className="space-y-2"
          >
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </LoadingBlock>
        ) : transactions.isError && !transactions.data ? (
          <LoadError
            title="Transakce se nepodařilo načíst"
            isRetrying={transactions.isFetching}
            onRetry={transactions.refetch}
          />
        ) : transactions.data.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Žádné nespárované transakce"
          />
        ) : (
          <>
            {transactions.isRefetchError ? (
              <LoadError
                title="Aktualizace se nezdařila"
                shownFrom={transactions.dataUpdatedAt}
                isRetrying={transactions.isFetching}
                onRetry={transactions.refetch}
              />
            ) : null}
            <BankTransactionsTable
              organizationId={organizationId}
              eventId={eventId}
              transactions={transactions.data}
              onPaired={onPaymentsChanged}
            />
          </>
        )}
      </div>
    </PageSection>
  )
}
