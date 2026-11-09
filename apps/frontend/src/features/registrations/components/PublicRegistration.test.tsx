import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  NO_NEEDS,
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
  event: { name: "Letní tábor", location: "Jizerka" },
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
  amountDueMinor: 450_050,
  paymentInstructions: {
    amountMinor: 450_050,
    variableSymbol: "2027094",
    account: { prefix: null, number: "2501234567", bankCode: "2010" },
    // 28 June 2027, 10:00 in Prague.
    reminderAt: "2027-06-28T08:00:00.000Z",
  },
  paymentLinkToken: "d".repeat(64),
}

/** The value next to a label in the payment summary, Intl's no-break spaces as plain ones. */
const valueOf = (label: string) =>
  screen
    .getByText(label, { selector: "dt" })
    .nextElementSibling?.textContent?.replace(/\u00a0/g, " ")

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
  await user.type(screen.getByLabelText(/^Jméno/), "Jana")
  await user.type(screen.getByLabelText(/^Příjmení/), "Nováková")
  await user.type(screen.getByLabelText(/^E-mail/), "jana@example.com")
  await user.type(screen.getByLabelText(/^Telefon/), phone)
}

const total = () =>
  within(screen.getByRole("region", { name: "Cena vybraných termínů" })).getAllByText(/Kč/)[0]

const sentBody = (call = 0) =>
  (post.mock.calls[call] as [string, { json: Record<string, unknown> }])[1].json

beforeEach(() => {
  post.mockReset()
  // jsdom lacks what Radix Select and scrolling to a field rely on.
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})

afterEach(() => {
  delete (Element.prototype as Partial<Element>).hasPointerCapture
  delete (Element.prototype as Partial<Element>).releasePointerCapture
  delete (Element.prototype as Partial<Element>).scrollIntoView
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
    expect(screen.getByText(/Pořadatel zatím nevypsal žádný termín/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Odeslat přihlášku" })).not.toBeInTheDocument()
  })
})

describe("validation", () => {
  it("shows each problem at its field, sends nothing and keeps what was filled in", async () => {
    renderForm()
    await user.type(screen.getByLabelText(/^Jméno/), "Jana")
    await user.type(screen.getByLabelText(/^E-mail/), "jana@")

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Vyberte alespoň jeden termín.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte příjmení.")).toBeInTheDocument()
    expect(screen.getByText("Zadejte platný e-mail.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte telefon.")).toBeInTheDocument()
    expect(screen.getByLabelText(/^Jméno/)).toHaveValue("Jana")
    expect(post).not.toHaveBeenCalled()
  })

  it.each(["123", "+420 12"])("refuses the phone %s", async (phone) => {
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact(phone)

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(
      await screen.findByText(
        "Zadejte platné telefonní číslo pro vybranou zemi, např. 777 123 456.",
      ),
    ).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    ["+420 777 123 456", "+420777123456"],
    ["777 123 456", "+420777123456"],
    ["+421 905 123 456", "+421905123456"],
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

describe("usability (S4-C03)", () => {
  it("offers Czechia with +420 and takes the prefix of another chosen country", async () => {
    post.mockReturnValue(respondWith(RESULT))
    renderForm()
    const country = screen.getByRole("combobox", { name: "Země a předvolba" })
    expect(country).toHaveTextContent("🇨🇿 +420")

    await user.click(country)
    await user.click(await screen.findByRole("option", { name: /Slovensko/ }))
    expect(country).toHaveTextContent("🇸🇰 +421")

    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact("905 123 456")
    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))
    await screen.findByText("Přihláška je uložená")
    expect(sentBody()).toMatchObject({ phone: "+421905123456" })
  })

  it("keeps a prefix typed by hand while it is typed", async () => {
    renderForm()
    const phone = screen.getByLabelText(/^Telefon/)
    await user.type(phone, "+421905")
    expect(phone).toHaveValue("+421905")
    expect(screen.getByRole("combobox", { name: "Země a předvolba" })).toHaveTextContent("🇸🇰 +421")
  })

  it("keeps the digits of a number typed with its prefix when the country is changed", async () => {
    renderForm()
    const phone = screen.getByLabelText(/^Telefon/)
    await user.type(phone, "+421 905 123 456")

    await user.click(screen.getByRole("combobox", { name: "Země a předvolba" }))
    await user.click(await screen.findByRole("option", { name: /Česko/ }))

    expect(phone).toHaveValue("905123456")
    expect(screen.getByRole("combobox", { name: "Země a předvolba" })).toHaveTextContent("+420")
  })

  it("marks required fields without a redundant form-wide note", () => {
    renderForm()
    expect(screen.queryByText(/Pole označená hvězdičkou/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Jméno/)).toBeRequired()
    expect(screen.getByLabelText(/^E-mail/)).toBeRequired()
    expect(screen.getByLabelText(/^Telefon/)).toBeRequired()
  })

  it("moves focus to the first invalid field and keeps the other values", async () => {
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await user.type(screen.getByLabelText(/^Jméno/), "Jana")
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    await waitFor(() => expect(screen.getByLabelText(/^Příjmení/)).toHaveFocus())
    expect(scroll).toHaveBeenCalled()
    expect(screen.getByLabelText(/^Jméno/)).toHaveValue("Jana")
    expect(screen.getByLabelText(/1\. turnus/)).toBeChecked()
  })
})

describe("the gender answer (F64)", () => {
  it("is voluntary: the form is sent without it as not answered", async () => {
    post.mockReturnValue(respondWith(RESULT))
    renderForm()
    expect(screen.getByRole("group", { name: "Pohlaví pro ubytování" })).toBeVisible()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(sentBody()).toMatchObject({ gender: null })
  })

  it("sends the one chosen answer, and none again after the choice is cleared", async () => {
    post.mockReturnValue(respondWith(RESULT))
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("radio", { name: "Žena" }))
    await user.click(screen.getByRole("radio", { name: "Nechci uvést" }))
    expect(screen.getByRole("radio", { name: "Žena" })).not.toBeChecked()
    expect(screen.getByRole("radio", { name: "Nechci uvést" })).toBeChecked()
    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))
    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(sentBody()).toMatchObject({ gender: "undisclosed" })
  })

  it("can be cleared back to no answer", async () => {
    renderForm()
    await user.click(screen.getByRole("radio", { name: "Muž" }))

    await user.click(screen.getByRole("button", { name: "Zrušit výběr" }))

    for (const radio of screen.getAllByRole("radio")) expect(radio).not.toBeChecked()
    expect(screen.queryByRole("button", { name: "Zrušit výběr" })).not.toBeInTheDocument()
  })

  it("asks for the own words only with Jiná odpověď and sends them trimmed", async () => {
    post.mockReturnValue(respondWith(RESULT))
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()
    const wordsField = { name: "Vlastní odpověď (nepovinné)" }
    expect(screen.queryByRole("textbox", wordsField)).not.toBeInTheDocument()

    await user.click(screen.getByRole("radio", { name: "Jiná odpověď" }))
    await user.type(screen.getByRole("textbox", wordsField), "  nebinární ")
    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(sentBody()).toMatchObject({ gender: "other", genderOther: "nebinární" })
  })

  it("drops the own words with another answer", async () => {
    post.mockReturnValue(respondWith(RESULT))
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("radio", { name: "Jiná odpověď" }))
    await user.type(
      screen.getByRole("textbox", { name: "Vlastní odpověď (nepovinné)" }),
      "nebinární",
    )
    await user.click(screen.getByRole("radio", { name: "Žena" }))
    expect(
      screen.queryByRole("textbox", { name: "Vlastní odpověď (nepovinné)" }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(sentBody()).toMatchObject({ gender: "female", genderOther: null })
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
    expect(screen.getByRole("heading", { name: "Letní tábor" })).toBeInTheDocument()
    // Payment summary: the whole selection, what the confirmed terms owe, and the stored instructions.
    expect(valueOf("Cena výběru")).toBe("4 500,50 Kč")
    expect(valueOf("K úhradě za potvrzené termíny")).toBe("4 500,50 Kč")
    expect(valueOf("Zaplaceno")).toBe("0 Kč")
    expect(valueOf("Zbývá zaplatit")).toBe("4 500,50 Kč")
    expect(valueOf("Datum připomenutí platby")).toBe("28. 6. 2027")
    expect(valueOf("Číslo účtu")).toBe("2501234567/2010")
    expect(valueOf("Variabilní symbol")).toBe("2027094")
    expect(screen.queryByText(/splatnost/i)).not.toBeInTheDocument()
    // The QR and link to pay this registration are offered right away (F21-1).
    expect(screen.getByRole("img", { name: "QR kód s odkazem na platbu" })).toBeInTheDocument()
    expect(
      screen.getByText(`${window.location.origin}/platba/${"d".repeat(64)}`),
    ).toBeInTheDocument()
    // No session is opened: other registrations stay behind the magic link.
    expect(screen.getByRole("link", { name: "Moje přihlášky" })).toHaveAttribute(
      "href",
      "/my-registrations",
    )
  })

  it("sends transport, diet and health once for the whole registration", async () => {
    post.mockReturnValue(respondWith(RESULT))
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await user.click(screen.getByLabelText(/2\. turnus/))
    await fillContact()
    await user.click(screen.getByRole("radio", { name: "Společná doprava" }))
    await user.click(screen.getByRole("checkbox", { name: "Bezlaktózová" }))
    await user.click(screen.getByRole("checkbox", { name: "Vegetariánská" }))
    await user.type(screen.getByLabelText("Zdravotní omezení"), " Astma ")

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(sentBody().needs).toEqual({
      ...NO_NEEDS,
      transport: "shared",
      diet: ["vegetarian", "lactose_free"],
      health: "Astma",
    })
  })

  it("sends needs left empty as not provided, never as “Bez omezení”", async () => {
    post.mockReturnValue(respondWith(RESULT))
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()

    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(sentBody().needs).toEqual(NO_NEEDS)
  })

  it("shows a new registration waiting for the organizer in every term, with nothing owed (S3-01)", async () => {
    post.mockReturnValue(
      respondWith({
        ...RESULT,
        terms: RESULT.terms.map((term) => ({ ...term, status: "pending" })),
        amountDueMinor: 0,
        paymentInstructions: null,
        paymentLinkToken: null,
      }),
    )
    renderForm()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()
    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))

    expect(await screen.findByText("Nyní nemáte platební povinnost.")).toBeInTheDocument()
    expect(screen.getAllByText("Čeká na rozhodnutí organizátora")).toHaveLength(2)
    expect(screen.queryByText("Zbývá zaplatit")).not.toBeInTheDocument()
    expect(screen.queryByText("Datum připomenutí platby")).not.toBeInTheDocument()
    expect(screen.queryByText("Variabilní symbol")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("img", { name: "QR kód s odkazem na platbu" }),
    ).not.toBeInTheDocument()
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
    expect(screen.getByLabelText(/^Příjmení/)).toHaveValue("Nováková")
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
    expect(screen.getByRole("link", { name: "Vyžádat přihlašovací odkaz" })).toHaveAttribute(
      "href",
      "/my-registrations",
    )
    expect(screen.getByLabelText(/^E-mail/)).toHaveValue("jana@example.com")
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

describe("draft for the browser tab (F55)", () => {
  it("brings back the typed values after leaving the form, and forgets them once saved", async () => {
    const first = renderAndLeave()
    await user.click(screen.getByLabelText(/1\. turnus/))
    await fillContact()
    first.unmount()

    renderForm()
    expect(screen.getByLabelText(/^Jméno/)).toHaveValue("Jana")
    expect(screen.getByLabelText(/^E-mail/)).toHaveValue("jana@example.com")
    expect(screen.getByLabelText(/1\. turnus/)).toBeChecked()

    post.mockReturnValue(respondWith(RESULT))
    await user.click(screen.getByRole("button", { name: "Odeslat přihlášku" }))
    expect(await screen.findByText("Přihláška je uložená")).toBeInTheDocument()
    expect(window.sessionStorage.getItem("akcio:registration-draft:abcdefghijkl")).toBeNull()
  })
})

function renderAndLeave() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <PublicRegistration
        publicId="abcdefghijkl"
        terms={TERMS}
      />
    </QueryClientProvider>,
  )
}
