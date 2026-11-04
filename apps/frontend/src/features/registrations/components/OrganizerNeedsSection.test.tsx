import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NO_NEEDS, type RegistrationNeeds } from "@/features/registrations/api/registrationSchemas"
import { OrganizerNeedsSection } from "@/features/registrations/components/OrganizerNeedsSection"
import { makeRegistrationDetail } from "@/features/registrations/fixtures/registrations"

type Body = { expectedVersion: number; needs: RegistrationNeeds }

const { put, FakeHttpError } = vi.hoisted(() => {
  class FakeHttpError extends Error {
    response: { status: number }
    data: unknown
    constructor(status: number, data: unknown) {
      super("http")
      this.response = { status }
      this.data = data
    }
  }
  return { put: vi.fn<(path: string, options: { json: Body }) => unknown>(), FakeHttpError }
})

vi.mock("@/lib/api-client", () => ({ api: { put }, HTTPError: FakeHttpError }))

const STORED: RegistrationNeeds = { ...NO_NEEDS, transport: "own", health: "Astma" }
const REGISTRATION = makeRegistrationDetail({ needs: STORED, version: 4 })

const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })
const failure = (status: number, data: unknown) => ({
  json: () => Promise.reject(new FakeHttpError(status, data)),
})

function setup(onReload = vi.fn()) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <OrganizerNeedsSection
        organizationId="org"
        eventId="event"
        registration={REGISTRATION}
        onReload={onReload}
      />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => put.mockReset())

describe("OrganizerNeedsSection", () => {
  it("shows the stored needs and saves a correction on the version it started from", async () => {
    const saved = { ...STORED, health: "Astma, inhalátor" }
    put.mockReturnValue(answer(makeRegistrationDetail({ needs: saved, version: 5 })))
    const user = setup()

    expect(screen.getByText("Astma")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Upravit" }))
    await user.type(screen.getByLabelText("Zdravotní omezení"), ", inhalátor ")
    await user.click(screen.getByRole("button", { name: "Uložit údaje" }))

    // Back to the summary; the route shows the saved detail from the query cache.
    expect(await screen.findByRole("button", { name: "Upravit" })).toBeInTheDocument()
    expect(put).toHaveBeenCalledOnce()
    expect(put).toHaveBeenCalledWith(
      `organizations/org/events/event/registrations/${REGISTRATION.id}/needs`,
      { json: { expectedVersion: 4, needs: saved } },
    )
  })

  it("keeps the entered values and shows no success when saving fails", async () => {
    put.mockReturnValue(failure(500, {}))
    const user = setup()

    await user.click(screen.getByRole("button", { name: "Upravit" }))
    await user.click(screen.getByRole("checkbox", { name: "Veganská" }))
    await user.click(screen.getByRole("button", { name: "Uložit údaje" }))

    expect(
      await screen.findByText(
        "Údaje se nepodařilo uložit. Zůstaly zachované, zkuste to prosím znovu.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Veganská" })).toBeChecked()
    expect(screen.getByRole("button", { name: "Uložit údaje" })).toBeEnabled()
  })

  it("asks to decide a waiting change request first and keeps the values", async () => {
    put.mockReturnValue(failure(409, { code: "change_pending" }))
    const user = setup()

    await user.click(screen.getByRole("button", { name: "Upravit" }))
    await user.click(screen.getByRole("checkbox", { name: "Veganská" }))
    await user.click(screen.getByRole("button", { name: "Uložit údaje" }))

    expect(
      await screen.findByText(
        "Přihláška má nevyřízenou žádost o změnu. Nejdřív o ní rozhodněte, údaje zůstaly zachované.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Veganská" })).toBeChecked()
  })

  it("does not overwrite a registration that changed meanwhile and offers a reload", async () => {
    put.mockReturnValue(failure(409, { code: "registration_stale" }))
    const onReload = vi.fn()
    const user = setup(onReload)

    await user.click(screen.getByRole("button", { name: "Upravit" }))
    await user.click(screen.getByRole("radio", { name: "Společná doprava" }))
    await user.click(screen.getByRole("button", { name: "Uložit údaje" }))
    await user.click(await screen.findByRole("button", { name: "Načíst aktuální údaje" }))

    expect(onReload).toHaveBeenCalledOnce()
    expect(screen.getByRole("button", { name: "Upravit" })).toBeInTheDocument()
  })

  it("sends nothing while a field is too long", async () => {
    const user = setup()

    await user.click(screen.getByRole("button", { name: "Upravit" }))
    await user.click(screen.getByLabelText("Vlastní text ke stravě"))
    await user.paste("x".repeat(501))
    await user.click(screen.getByRole("button", { name: "Uložit údaje" }))

    expect(
      screen.getByText("Vlastní text ke stravě může mít nejvýše 500 znaků."),
    ).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })
})
