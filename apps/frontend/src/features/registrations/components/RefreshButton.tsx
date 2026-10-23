import { Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type RefreshButtonProps = { isRefreshing: boolean; onRefresh: () => unknown }

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
