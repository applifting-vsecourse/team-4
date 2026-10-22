import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"

import { EventLoadError } from "@/features/events/components/EventLoadError"

vi.mock("@/features/events/components/EventBreadcrumb", () => ({
  EventBreadcrumb: () => null,
}))

const BACK = <button type="button">Zpět na přehled akcí</button>

function httpError(status: number) {
  const error = Object.create(HTTPError.prototype) as HTTPError
  Object.defineProperty(error, "response", { value: { status } })
  return error
}

describe("EventLoadError", () => {
  it("offers a retry for a failed load without claiming the event has no terms", async () => {
    const onRetry = vi.fn()
    render(
      <EventLoadError
        organizationId="org-a"
        error={new Error("Failed to fetch")}
        onRetry={onRetry}
        backAction={BACK}
      />,
    )
    expect(screen.queryByText(/nemá žádný termín/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("retries after a server error", () => {
    render(
      <EventLoadError
        organizationId="org-a"
        error={httpError(500)}
        onRetry={vi.fn()}
        backAction={BACK}
      />,
    )
    expect(screen.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
  })

  it.each([403, 404])(
    "keeps a foreign or missing event (%i) unavailable without retry",
    (status) => {
      render(
        <EventLoadError
          organizationId="org-a"
          error={httpError(status)}
          onRetry={vi.fn()}
          backAction={BACK}
        />,
      )
      expect(screen.getByText("Záznam není dostupný")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Zpět na přehled akcí" })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Zkusit znovu" })).not.toBeInTheDocument()
    },
  )
})
