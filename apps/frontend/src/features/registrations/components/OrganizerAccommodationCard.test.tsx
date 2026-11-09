import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { eventRegistrationKeys } from "@/features/registrations/api/eventRegistrationQueryOptions"
import { type RegistrationDetail } from "@/features/registrations/api/eventRegistrationSchemas"
import { OrganizerAccommodationCard } from "@/features/registrations/components/OrganizerAccommodationCard"
import { makeRegistrationDetail } from "@/features/registrations/fixtures/registrations"

const { put, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { put: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({
  api: { put: (...args: unknown[]) => put(...args) as unknown },
  HTTPError: FakeHTTPError,
}))

const ORGANIZATION = "0190c0de-0000-7000-8000-0000000000b1"
const EVENT = "0190c0de-0000-7000-8000-0000000000b2"

const user = userEvent.setup()

function renderCard(registration: RegistrationDetail) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  queryClient.setQueryData(
    eventRegistrationKeys.detail(ORGANIZATION, EVENT, registration.id),
    registration,
  )
  render(
    <QueryClientProvider client={queryClient}>
      <OrganizerAccommodationCard
        organizationId={ORGANIZATION}
        eventId={EVENT}
        registration={registration}
      />
    </QueryClientProvider>,
  )
  return queryClient
}

const respondWith = (body: unknown) => ({ json: () => Promise.resolve(body) })
const failWith = (status: number, body: unknown) => ({
  json: () => Promise.reject(new FakeHTTPError({ status }, body)),
})

beforeEach(() => {
  put.mockReset()
})

describe("OrganizerAccommodationCard", () => {
  it("shows no answer as Neuvedeno, decided by hand", () => {
    renderCard(makeRegistrationDetail({ gender: null, requiresManualAccommodation: true }))

    expect(screen.getByText("Neuvedeno")).toBeInTheDocument()
    expect(screen.getByText("Ubytování je potřeba určit ručně")).toBeInTheDocument()
  })

  it("tells Nechci uvést apart from no answer", () => {
    renderCard(makeRegistrationDetail({ gender: "undisclosed", requiresManualAccommodation: true }))

    expect(screen.getByText("Nechci uvést")).toBeInTheDocument()
    expect(screen.queryByText("Neuvedeno")).not.toBeInTheDocument()
    expect(screen.getByText("Ubytování je potřeba určit ručně")).toBeInTheDocument()
  })

  it("asks for nothing by hand for Žena or Muž", () => {
    renderCard(makeRegistrationDetail({ gender: "male", requiresManualAccommodation: false }))

    expect(screen.getByText("Muž")).toBeInTheDocument()
    expect(screen.queryByText("Ubytování je potřeba určit ručně")).not.toBeInTheDocument()
  })

  it("saves a correction and shows the stored answer", async () => {
    const registration = makeRegistrationDetail({ gender: null, requiresManualAccommodation: true })
    const saved = { ...registration, gender: "female", requiresManualAccommodation: false }
    put.mockReturnValue(respondWith(saved))
    const queryClient = renderCard(registration)

    await user.click(screen.getByRole("button", { name: "Opravit" }))
    await user.click(screen.getByRole("radio", { name: "Žena" }))
    await user.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByRole("button", { name: "Opravit" })).toBeInTheDocument()
    expect(put).toHaveBeenCalledWith(
      `organizations/${ORGANIZATION}/events/${EVENT}/registrations/${registration.id}/gender`,
      { json: { gender: "female", genderOther: null } },
    )
    expect(
      queryClient.getQueryData<RegistrationDetail>(
        eventRegistrationKeys.detail(ORGANIZATION, EVENT, registration.id),
      )?.gender,
    ).toBe("female")
  })

  it("shows and corrects the own words of Jiná odpověď", async () => {
    const registration = makeRegistrationDetail({
      gender: "other",
      genderOther: "nebinární",
      requiresManualAccommodation: true,
    })
    put.mockReturnValue(respondWith({ ...registration, genderOther: "agender" }))
    renderCard(registration)
    expect(screen.getByText("Vlastní odpověď")).toBeInTheDocument()
    expect(screen.getByText("nebinární")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Opravit" }))
    const words = screen.getByRole("textbox", { name: "Vlastní odpověď" })
    expect(words).toHaveValue("nebinární")
    await user.clear(words)
    await user.type(words, " agender ")
    await user.click(screen.getByRole("button", { name: "Uložit" }))

    expect(put).toHaveBeenCalledWith(expect.any(String), {
      json: { gender: "other", genderOther: "agender" },
    })
  })

  it("keeps the choice and the stored answer when saving fails, without a success", async () => {
    const registration = makeRegistrationDetail({ gender: "female" })
    put.mockReturnValue(
      failWith(409, {
        statusCode: 409,
        code: "change_pending",
        message: "Přihláška má nevyřízenou žádost o změnu. Nejdřív o ní rozhodněte.",
      }),
    )
    renderCard(registration)

    await user.click(screen.getByRole("button", { name: "Opravit" }))
    await user.click(screen.getByRole("radio", { name: "Jiná odpověď" }))
    await user.click(screen.getByRole("button", { name: "Uložit" }))

    expect(
      await screen.findByText("Přihláška má nevyřízenou žádost o změnu. Nejdřív o ní rozhodněte."),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Jiná odpověď" })).toBeChecked()
    expect(screen.getByRole("button", { name: "Uložit" })).toBeEnabled()
  })
})
