import { Loader2 } from "lucide-react"

export function AppLoadingScreen() {
  return (
    <div className="grid min-h-svh place-content-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}
