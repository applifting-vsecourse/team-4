import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

// Any failure of a route without its own error component. The thrown value is
// not shown: it is technical and in English.
export function RootErrorBoundary() {
  return (
    <ErrorLayout
      title="Stránku se nepodařilo načíst"
      description="Zkontrolujte připojení a zkuste to znovu."
      action={<Button onClick={() => window.location.reload()}>Zkusit znovu</Button>}
    />
  )
}
