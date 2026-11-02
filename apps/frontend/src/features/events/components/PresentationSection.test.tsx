import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { eventKeys } from "@/features/events/api/eventQueryOptions"
import { type EventDetail } from "@/features/events/api/eventSchemas"
import { PresentationSection } from "@/features/events/components/PresentationSection"

const { put, post, get, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { put: vi.fn(), post: vi.fn(), get: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({
  api: {
    put: (...args: unknown[]) => put(...args) as unknown,
    post: (...args: unknown[]) => post(...args) as unknown,
    get: (...args: unknown[]) => get(...args) as unknown,
    delete: vi.fn(),
  },
  HTTPError: FakeHTTPError,
}))

const ORGANIZATION_ID = "0190c0de-0000-7000-8000-000000000001"
const EVENT_ID = "0190c0de-0000-7000-8000-000000000002"

const EVENT: EventDetail = {
  id: EVENT_ID,
  name: "Tábor",
  description: "Týden v lesích.",
  location: "Podlesí",
  status: "draft",
  isLocked: false,
  terms: [],
  paymentSettings: null,
  changeApprovalDays: null,
  publicId: "abcdefghijkl",
  isPublished: false,
  conditions: "",
  contact: null,
  photos: [],
  openingBlockers: [],
}

function Page() {
  const { data } = useQuery<EventDetail>({
    queryKey: eventKeys.detail(ORGANIZATION_ID, EVENT_ID),
    queryFn: () => Promise.reject(new Error("not refetched in this test")),
    staleTime: Infinity,
  })
  return data ? (
    <PresentationSection
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

const user = userEvent.setup()
const save = () => screen.getByRole("button", { name: "Uložit" })

describe("PresentationSection", () => {
  beforeEach(() => {
    put.mockReset()
    post.mockReset()
    get.mockReset()
  })

  it("saves conditions and the public contact and shows what the server saved", async () => {
    put.mockReturnValue({
      json: () =>
        Promise.resolve({
          ...EVENT,
          conditions: "Věk 11 až 15 let.",
          contact: { name: "Jana", email: "jana@example.test", phone: "+420604123456" },
        }),
    })
    renderPage(EVENT)

    await user.type(screen.getByLabelText("Podmínky účasti"), "Věk 11 až 15 let.")
    await user.type(screen.getByLabelText("Jméno nebo název"), "Jana")
    await user.type(screen.getByLabelText("E-mail"), "jana@example.test")
    await user.type(screen.getByLabelText("Telefon (nepovinné)"), "+420 604 123 456")
    await user.click(save())

    expect(put).toHaveBeenCalledWith(expect.stringContaining(`/events/${EVENT_ID}/presentation`), {
      json: {
        description: "Týden v lesích.",
        conditions: "Věk 11 až 15 let.",
        contactName: "Jana",
        contactEmail: "jana@example.test",
        contactPhone: "+420 604 123 456",
      },
    })
    expect(await screen.findByLabelText("Telefon (nepovinné)")).toHaveValue("+420604123456")
  })

  it("asks for a name and an e-mail once any contact field is filled", async () => {
    renderPage(EVENT)

    await user.type(screen.getByLabelText("Telefon (nepovinné)"), "+420 604 123 456")
    await user.click(save())

    expect(await screen.findByText("Vyplňte jméno nebo název kontaktu.")).toBeVisible()
    expect(screen.getByText("Zadejte platný e-mail.")).toBeVisible()
    expect(put).not.toHaveBeenCalled()
  })

  it("keeps a locked description and sends it unchanged", async () => {
    put.mockReturnValue({ json: () => Promise.resolve({ ...EVENT, isLocked: true }) })
    renderPage({ ...EVENT, isLocked: true })

    expect(screen.getByLabelText("Popis akce")).toBeDisabled()
    expect(screen.getByText("Od prvního otevření přihlašování popis nelze měnit.")).toBeVisible()
    await user.click(save())

    expect(put).toHaveBeenCalledWith(expect.any(String), {
      json: expect.objectContaining({ description: "Týden v lesích." }) as unknown,
    })
  })

  it("keeps the typed values after a failed save", async () => {
    put.mockReturnValue({
      json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})),
    })
    renderPage(EVENT)

    await user.type(screen.getByLabelText("Podmínky účasti"), "Věk 11 až 15 let.")
    await user.click(save())

    expect(
      await screen.findByText("Veřejnou prezentaci se nepodařilo uložit. Zkuste to prosím znovu."),
    ).toBeVisible()
    expect(screen.getByLabelText("Podmínky účasti")).toHaveValue("Věk 11 až 15 let.")
  })

  it("refuses a file that is not a photo before uploading it", async () => {
    renderPage(EVENT)

    await userEvent.upload(
      screen.getByLabelText("Soubor s fotkou"),
      new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }),
      { applyAccept: false },
    )

    expect(await screen.findByText("Nahrajte fotku ve formátu JPEG, PNG nebo WebP.")).toBeVisible()
    expect(post).not.toHaveBeenCalled()
  })

  it("uploads a photo and offers no more uploads at the limit", async () => {
    const photos = [1, 2, 3, 4].map((n) => ({ id: `0190c0de-0000-7000-8000-00000000040${n}` }))
    post.mockReturnValue({ json: () => Promise.resolve({ ...EVENT, photos }) })
    get.mockReturnValue({ blob: () => Promise.resolve(new Blob(["x"], { type: "image/png" })) })
    renderPage({ ...EVENT, photos: photos.slice(0, 3) })

    await userEvent.upload(
      screen.getByLabelText("Soubor s fotkou"),
      new File(["png"], "les.png", { type: "image/png" }),
    )

    expect(post).toHaveBeenCalledWith(expect.stringContaining(`/events/${EVENT_ID}/photos`), {
      body: expect.any(FormData) as unknown,
    })
    expect(await screen.findAllByRole("button", { name: /^Odebrat/ })).toHaveLength(4)
    expect(screen.getByRole("button", { name: "Přidat fotku" })).toBeDisabled()
  })
})
