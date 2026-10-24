import { type QueryClient } from "@tanstack/react-query"
import { waitFor } from "storybook/test"

import { type AppRouter } from "@/app/createAppRouter"

// The prototype on screen, so a story's play function can wait for it.
let active: { router: AppRouter; queryClient: QueryClient } | null = null

export function setActiveSession(session: typeof active) {
  active = session
}

const isSettled = () => {
  if (!active) return false
  const { router, queryClient } = active
  return (
    router.state.status === "idle" &&
    !router.state.isLoading &&
    queryClient.isFetching() === 0 &&
    queryClient.isMutating() === 0
  )
}

/**
 * Resolves once the page has loaded: no route is loading and no request is
 * pending, twice in a row (a finished load can start the next one). Stories
 * run their a11y check after play, so it sees the page, not the spinner.
 */
export async function waitForPage() {
  const settled = () => {
    if (!isSettled()) throw new Error("The page is still loading.")
  }
  for (let check = 0; check < 2; check++) {
    await waitFor(settled, { timeout: 5000 })
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  await waitFor(settled, { timeout: 5000 })
}
