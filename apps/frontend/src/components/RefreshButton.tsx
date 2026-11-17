import { RefreshCw } from "lucide-react"

import { PendingButton } from "@/components/PendingButton"

type RefreshButtonProps = { isRefreshing: boolean; onRefresh: () => unknown }

// Reloads the data of a list or detail; spins and is disabled while it runs.
export function RefreshButton({ isRefreshing, onRefresh }: RefreshButtonProps) {
  return (
    <PendingButton
      variant="outline"
      isPending={isRefreshing}
      icon={<RefreshCw />}
      onClick={() => onRefresh()}
    >
      {isRefreshing ? "Aktualizuji…" : "Aktualizovat"}
    </PendingButton>
  )
}
