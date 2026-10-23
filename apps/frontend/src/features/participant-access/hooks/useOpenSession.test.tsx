import { StrictMode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useOpenSession } from "@/features/participant-access/hooks/useOpenSession"

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock("@/lib/api-client", () => ({
  api: { post: (...args: unknown[]) => post(...args) as unknown },
}))

function Probe({ token }: { token?: string }) {
  return <p>{useOpenSession(token)}</p>
}

// StrictMode runs effects twice in development, which is how the page hung.
function renderProbe(token?: string) {
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <Probe token={token} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  post.mockReset()
})

describe("useOpenSession", () => {
  it("spends the link once and reports success, also under StrictMode", async () => {
    post.mockResolvedValue(undefined)
    renderProbe("a-token")

    expect(await screen.findByText("opened")).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith("participant/session", { json: { token: "a-token" } })
  })

  it("reports a refused link instead of waiting forever, also under StrictMode", async () => {
    post.mockRejectedValue(new Error("401"))
    renderProbe("a-token")

    await waitFor(() => expect(screen.getByText("failed")).toBeInTheDocument())
    expect(post).toHaveBeenCalledTimes(1)
  })

  it("fails at once without a token and sends nothing", () => {
    renderProbe(undefined)

    expect(screen.getByText("failed")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })
})
