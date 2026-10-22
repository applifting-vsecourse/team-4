import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MagicLinkRequest } from "@/features/participant-access/components/MagicLinkRequest"

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock("@/lib/api-client", () => ({
  api: { post: (...args: unknown[]) => post(...args) as unknown },
  HTTPError: class extends Error {},
}))

const MESSAGE = "Pokud k tomuto e-mailu existují přihlášky, pošleme vám přihlašovací odkaz."

const user = userEvent.setup()

function renderRequest(notice?: string) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MagicLinkRequest notice={notice} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  post.mockReset()
})

describe("MagicLinkRequest", () => {
  it("shows the server's confirmation after the request", async () => {
    post.mockReturnValue({ json: () => Promise.resolve({ message: MESSAGE }) })
    renderRequest()

    await user.type(screen.getByLabelText("E-mail"), "jan@novak.cz")
    await user.click(screen.getByRole("button", { name: "Poslat přihlašovací odkaz" }))

    expect(await screen.findByText(MESSAGE)).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith("participant/magic-links", {
      json: { email: "jan@novak.cz" },
    })
  })

  it("keeps the form visible with the entered e-mail under the confirmation", async () => {
    post.mockReturnValue({ json: () => Promise.resolve({ message: MESSAGE }) })
    renderRequest()

    await user.type(screen.getByLabelText("E-mail"), "jan@novak.cz")
    await user.click(screen.getByRole("button", { name: "Poslat přihlašovací odkaz" }))
    await screen.findByText(MESSAGE)

    expect(screen.getByLabelText("E-mail")).toHaveValue("jan@novak.cz")
  })

  it("asks for a valid e-mail and sends nothing otherwise", async () => {
    renderRequest()

    await user.click(screen.getByRole("button", { name: "Poslat přihlašovací odkaz" }))
    expect(await screen.findByText("Zadejte e-mail.")).toBeInTheDocument()

    await user.type(screen.getByLabelText("E-mail"), "nesmysl")
    await user.click(screen.getByRole("button", { name: "Poslat přihlašovací odkaz" }))
    expect(await screen.findByText("Zadejte e-mail ve správném tvaru.")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it("keeps the form and says so when the request fails", async () => {
    post.mockReturnValue({ json: () => Promise.reject(new Error("offline")) })
    renderRequest()

    await user.type(screen.getByLabelText("E-mail"), "jan@novak.cz")
    await user.click(screen.getByRole("button", { name: "Poslat přihlašovací odkaz" }))

    expect(await screen.findByText(/nepodařilo vyžádat/)).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toHaveValue("jan@novak.cz")
  })

  it("explains why the visitor is here and still offers a new link", () => {
    renderRequest("Odkaz už není platný.")

    expect(screen.getByText("Odkaz už není platný.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Poslat přihlašovací odkaz" })).toBeEnabled()
  })
})
