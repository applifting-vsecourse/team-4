import { DefinitionRow } from "@/components/DefinitionList"

import {
  BalanceAmount,
  type BalanceAmountProps,
} from "@/features/registrations/components/BalanceAmount"

// „Zbývá zaplatit“ as the emphasised total of a payment overview (F21-1).
export function BalanceRow(props: BalanceAmountProps) {
  return (
    <DefinitionRow
      label="Zbývá zaplatit"
      isEmphasised
    >
      <BalanceAmount {...props} />
    </DefinitionRow>
  )
}
