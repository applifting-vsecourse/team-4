import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  type RegistrationResult,
  type SelectableTerm,
} from "@/features/registrations/api/registrationSchemas"
import { PublicRegistration } from "@/features/registrations/components/PublicRegistration"

const { post, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { post: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({
  api: { post: (...args: unknown[]) => post(...args) as unknown },
  HTTPError: FakeHTTPError,
}))

const T1 = "0190c0de-0000-7000-8000-000000000011"
const T2 = "0190c0de-0000-7000-8000-000000000012"

const TERMS: SelectableTerm[] = [
  {
    id: T1,
    label: "1. turnus",
    startDate: "2027-07-01",
    endDate: "2027-07-07",
    priceMinor: 450_050,
  },
  { id: T2, label: "2. turnus", startDate: "2027-07-15", endDate: "2027-07-21", priceMinor: 0 },
]

const RESULT: RegistrationResult = {
  id: "0190c0de-0000-7000-8000-000000000099",
  receivedAt: "2026-10-20T12:03:00.000Z",
  firstName: "Jana",
  lastName: "Nováková",
  email: "jana@example.com",
  phone: "+420777123456",
  terms: [
    {
      termId: T1,
      label: "1. turnus",
      startDate: "2027-07-01",
      endDate: "2027-07-07",
      priceMinor: 450_050,
      status: "confirmed",
    },
    {
      termId: T2,
      label: "2. turnus",
      startDate: "2027-07-15",
      endDate: "2027-07-21",
      priceMinor: 0,
      status: "waitlisted",
    },
  ],
  selectedPriceMinor: 450_050,
}

const respondWith = (body: unknown) => ({ json: () => Promise.resolve(body) })
const failWith = (status: number, body: unknown) => ({
  json: () => Promise.reject(new FakeHTTPError({ status }, body)),
})

function renderForm(terms: SelectableTerm[] = TERMS) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <PublicRegistration
        publicId="abcdefghijkl"
        terms={terms}
      />
    </QueryClientProvider>,
  )
}

const user = userEvent.setup()

async function fillContact(phone = "+420 777 123 456") {
  await user.type(screen.getByLabelText("Jméno"), "Jana")
  await user.type(screen.getByLabelText("Příjmení"), "Nováková")
  await user.type(screen.getByLabelText("E-mail"), "jana@example.com")
  await user.type(screen.getByLabelText("Telefon"), phone)
}

const total = () =>
  within(screen.getByRole("region", { name: "Cena vybraných termínů" })).getAllByText(/Kč/)[0]

const sentBody = (call = 0) =>
  (post.mock.calls[call] as [string, { json: Record<string, unknown> }])[1].json

beforeEach(() => {
  post.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("selecting terms", () => {
  it("lists every term with its dates and price and nothing about availability", () => {
    renderForm()

    expect(screen.getByLabelText(/1\. turnus/)).toBeInTheDocument()
    expect(screen.getByText("1. 7. – 7. 7. 2027")).toBeInTheDocument()
    expect(screen.getByText("4 500,50 Kč")).toBeInTheDocument()
    expect(screen.getByLabelText(/2\. turnus/).closest("div")).toHaveTextContent("0 Kč")
    expect(screen.queryByText(/volná|obsazen|kapacit|lůžk|náhradník/i)).not.toBeInTheDocument()
  })

  it("sums the selected terms exactly after every change, starting at 0 Kč", async () => {
    renderForm()
    expect(total()).toHaveTextContent("0 Kč")

    await user.click(screen.getByLabelText(/1\. turnus/))
    expect(total()).toHaveTextContent("4 500,50 Kč")
    await user.click(screen.getByLabelText(/2\. turnus/))
    expect(total()).toHaveTextContent("4 500,50 Kč")
    await user.click(screen.getByLabelText(/1\. turnus/))
    expect(total()).toHaveTextContent("0 Kč")
    expect(screen.getByText(/Nejde o částku k úhradě/)).toBeInTheDocument()
  })

  it("explains that nothing can be submitted without terms", () => {
    renderForm([])

    expect(screen.getByText("Akce nemá termíny k výběru")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Odeslat přihlášku" })).not.toBeInTheDocument()
  })
})

describe("validation", () => {
  it("shows each problem at its field, sends nothing and keeps what was filled in", async () => {
    renderForm()
    await user.type(screen.getByLabelText("Jméno"), "Jana")
    await user.type(screen.getByLabelText("E-mail"), "jana@")

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Vyberte alespoň jeden termín.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte příjmení.")).toBeInTheDocument()
    expect(screen.getByText("Zadejte platný e-mail.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte telefon.")).toBeInTheDocument()
    expect(screen.getByLabelText("Jméno")).toHaveValue("Jana")
    expect(post).not.toHaveBeenCalled()
  })

  it.each(["777 123 456", "+420 12"])("refuses the phone %s", async (phone) => {
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact(phone)

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(
      await screen.findByText("Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456."),
    ).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    ["+420 777 123 456", "+420777123456"],
    ["+44 7911 123456", "+447911123456"],
  ])("sends the phone %s as %s", async (phone, e164) => {
    post.mockReturnValue(respondWith(RESULT))
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact(phone)

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    await screen.findByText("Přihláška je uložená")
    expect(sentBody()).toMatchObject({ phone: e164 })
  })
})

describe("submitting", () => {
  it("sends the selection once, shows progress, then the stored result of each term", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockReturnValue(undefined)
    let resolve: ((body: unknown) => void) | undefined
    post.mockReturnValue({ json: () => new Promise((r) => (resolve = r)) })
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await user.click(screen.getByLabelText(/2\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))
    const pending = screen.getByRole("button", { name: "Odesílám přihlášku…" })
    expect(pending).toBeDisabled()
    await user.click(pending)
    expect(screen.queryByText("Přihláška je uložená")).not.toBeInTheDocument()
    resolve?.(RESULT)

    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" })
    expect(screen.getByRole("heading", { name: "Přihláška je uložená" })).toHaveFocus()
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]?.[0]).toBe("public/events/abcdefghijkl/registrations")
    expect(sentBody()).toMatchObject({
      firstName: "Jana",
      lastName: "Nováková",
      email: "jana@example.com",
      termIds: [T1, T2],
    })
    expect(sentBody()).not.toHaveProperty("priceMinor")
    const terms = screen.getAllByRole("listitem")
    expect(within(terms[0]!).getByText("Potvrzeno")).toBeInTheDocument()
    expect(within(terms[1]!).getByText("Náhradník")).toBeInTheDocument()
    expect(
      screen.getByText("Pokud se místo uvolní a bude vám přiděleno, dáme vám vědět e-mailem."),
    ).toBeInTheDocument()
    expect(screen.getByText(/20\. 10\. 2026 14:03/)).toBeInTheDocument()
  })

  it("keeps the form after a failure and retries with the same submission key", async () => {
    post.mockReturnValueOnce(failWith(500, { message: "Internal server error" }))
    post.mockReturnValueOnce(respondWith(RESULT))
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))
    expect(await screen.findByText(/Přihlášku se nepodařilo odeslat/)).toBeInTheDocument()
    expect(screen.queryByText("Přihláška je uložená")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Příjmení")).toHaveValue("Nováková")
    expect(screen.getByLabelText(/1\. turnus/)).toBeChecked()

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(sentBody(1).submissionKey).toBe(sentBody(0).submissionKey)
  })

  it("says a registration exists for the e-mail without showing any of it", async () => {
    post.mockReturnValue(
      failWith(409, {
        statusCode: 409,
        code: "already_registered",
        field: "email",
        message: "Přihláška s tímto e-mailem na tuto akci již existuje.",
      }),
    )
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Přihláška s tímto e-mailem již existuje")).toBeInTheDocument()
    expect(screen.queryByText("Potvrzeno")).not.toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toHaveValue("jana@example.com")
  })

  it("explains a refused submit to an event that is not open", async () => {
    post.mockReturnValue(failWith(404, { statusCode: 404, code: "event_unavailable" }))
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Přihlašování není dostupné")).toBeInTheDocument()
    expect(screen.queryByText("Přihláška je uložená")).not.toBeInTheDocument()
  })

  it("puts a refused term selection at the terms", async () => {
    post.mockReturnValue(
      failWith(400, {
        code: "term_unknown",
        field: "termIds",
        message: "Vyberte termíny této akce.",
      }),
    )
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Vyberte termíny této akce.")).toBeInTheDocument()
  })
})
