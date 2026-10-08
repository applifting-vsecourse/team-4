import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

type RootErrorBoundaryProps = {
  error: Error
}

export function RootErrorBoundary({ error }: RootErrorBoundaryProps) {
  return (
    <ErrorLayout
      title="Something went wrong"
      description={error.message || "An unexpected error occurred."}
      action={<Button onClick={() => window.location.reload()}>Reload</Button>}
    />
  )
}
