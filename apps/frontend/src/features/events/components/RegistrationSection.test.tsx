import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { eventKeys } from "@/features/events/api/eventQueryOptions"
import { type EventDetail } from "@/features/events/api/eventSchemas"
import { RegistrationSection } from "@/features/events/components/RegistrationSection"

const post = vi.fn()

vi.mock("@/lib/api-client", () => ({
  api: { post: (...args: unknown[]) => post(...args) as unknown },
  HTTPError: class HTTPError extends Error {},
}))

// Render route destinations so prerequisite links are covered without mounting the router.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    hash,
  }: {
    children: React.ReactNode
    to: string
    params: Record<string, string>
    hash?: string
  }) => {
    const path = to.replace(/\$(\w+)/g, (_, key: string) => params[key] ?? "")
    return <a href={`${path}${hash ? `#${hash}` : ""}`}>{children}</a>
  },
}))

const ORGANIZATION_ID = "0190c0de-0000-7000-8000-000000000001"
const EVENT_ID = "0190c0de-0000-7000-8000-000000000002"

const READY: EventDetail = {
  id: EVENT_ID,
  name: "Tábor",
  description: "Popis",
  location: "Podlesí",
  status: "draft",
  isLocked: false,
  terms: [],
  paymentSettings: null,
  publicId: "abcdefghijkl",
  isPublished: false,
  openingBlockers: [],
}

const OPENED: EventDetail = { ...READY, status: "open", isLocked: true }

function Page() {
  const { data } = useQuery<EventDetail>({
    queryKey: eventKeys.detail(ORGANIZATION_ID, EVENT_ID),
    queryFn: () => Promise.reject(new Error("not refetched in this test")),
    staleTime: Infinity,
  })
  return data ? (
    <RegistrationSection
      organizationId={ORGANIZATION_ID}
      event={data}
    />
  ) : null
}

function renderPage(event: EventDetail) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(eventKeys.detail(ORGANIZATION_ID, EVENT_ID), event)
  render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>,
  )
}

describe("RegistrationSection", () => {
  beforeEach(() => {
    post.mockReset()
  })

  it("keeps the opening disabled and names what is missing", () => {
    renderPage({ ...READY, openingBlockers: ["terms", "paymentSettings"] })

    expect(screen.getByRole("button", { name: "Otevřít přihlašování" })).toBeDisabled()
    expect(screen.getByText(/Alespoň jeden termín s cenou/)).toBeInTheDocument()
    const links = screen.getAllByRole("link", { name: "Doplnit" })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute(
      "href",
      `/organizations/${ORGANIZATION_ID}/events/${EVENT_ID}/settings#terms-heading`,
    )
    expect(links[1]).toHaveAttribute(
      "href",
      `/organizations/${ORGANIZATION_ID}/events/${EVENT_ID}/settings#payments-heading`,
    )
    expect(
      screen.getByText("Otevřením přihlašování zamknete název, popis, místo, termíny a ceny."),
    ).toBeInTheDocument()
  })

  it("shows the full public link already in a draft", () => {
    renderPage({ ...READY, openingBlockers: ["terms"] })

    expect(screen.getByLabelText("Veřejný odkaz na přihlášku")).toHaveValue(
      `${window.location.origin}/e/abcdefghijkl`,
    )
  })

  it("opens at once, without a confirmation dialog, and shows the saved state", async () => {
    post.mockReturnValue({ json: () => Promise.resolve(OPENED) })
    renderPage(READY)

    await userEvent.click(screen.getByRole("button", { name: "Otevřít přihlašování" }))

    expect(post).toHaveBeenCalledWith(
      `organizations/${ORGANIZATION_ID}/events/${EVENT_ID}/open-registration`,
    )
    expect(await screen.findByText("Přihlašování je otevřené")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Otevřít přihlašování" })).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("stays a draft and offers a retry when opening fails", async () => {
    post.mockReturnValue({ json: () => Promise.reject(new Error("network")) })
    renderPage(READY)

    await userEvent.click(screen.getByRole("button", { name: "Otevřít přihlašování" }))

    expect(await screen.findByText(/nepodařilo otevřít/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Otevřít přihlašování" })).toBeEnabled()
  })

  it("confirms the copy only after it succeeded", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    renderPage(OPENED)

    expect(screen.queryByText("Zkopírováno")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Kopírovat" }))

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/e/abcdefghijkl`)
    expect(await screen.findByText("Zkopírováno")).toBeInTheDocument()
  })

  it("keeps the address for a manual copy when copying fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"))
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    renderPage(OPENED)

    await userEvent.click(screen.getByRole("button", { name: "Kopírovat" }))

    await waitFor(() => expect(screen.getByText(/zkopírujte ručně/)).toBeInTheDocument())
    expect(screen.queryByText("Zkopírováno")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Veřejný odkaz na přihlášku")).toBeVisible()
  })
})
