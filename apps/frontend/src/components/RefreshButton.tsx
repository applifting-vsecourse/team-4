import { Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type RefreshButtonProps = { isRefreshing: boolean; onRefresh: () => unknown }

// Reloads the data of a list or detail; spins and is disabled while it runs.
export function RefreshButton({ isRefreshing, onRefresh }: RefreshButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={() => onRefresh()}
      disabled={isRefreshing}
    >
      {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw />}
      {isRefreshing ? "Aktualizuji…" : "Aktualizovat"}
    </Button>
  )
}
