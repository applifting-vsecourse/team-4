import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

type RootErrorBoundaryProps = {
  // The router passes whatever was thrown, not only an Error.
  error: unknown
}

export function RootErrorBoundary({ error }: RootErrorBoundaryProps) {
  return (
    <ErrorLayout
      title="Something went wrong"
      description={(error instanceof Error && error.message) || "An unexpected error occurred."}
      action={<Button onClick={() => window.location.reload()}>Reload</Button>}
    />
  )
}
