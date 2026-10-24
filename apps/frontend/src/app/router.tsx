import { createAppRouter } from "@/app/createAppRouter"
import { queryClient } from "@/config/react-query"

export const router = createAppRouter({ queryClient })

declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router
  }
}
