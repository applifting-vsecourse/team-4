import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

import { type TermCapacity } from "@/features/rooms/api/roomSchemas"
import {
  RoomForm,
  type RoomFieldError,
  type RoomFormValues,
} from "@/features/rooms/components/RoomForm"

// The links need a router; the tests only look at their text.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>,
}))

const T1 = "0190c0de-0000-7000-8000-000000000011"
const T2 = "0190c0de-0000-7000-8000-000000000012"

const TERMS: TermCapacity[] = [
  {
    id: T1,
    label: "T1",
    startDate: "2027-07-01",
    endDate: "2027-07-07",
    capacity: 0,
    confirmed: 0,
  },
  {
    id: T2,
    label: "T2",
    startDate: "2027-07-15",
    endDate: "2027-07-21",
    capacity: 0,
    confirmed: 0,
  },
]

const EMPTY: RoomFormValues = { label: "", bedCount: "", termIds: [] }

function renderForm(
  initialValues: RoomFormValues,
  options: { terms?: TermCapacity[]; fieldError?: RoomFieldError } = {},
) {
  const onSubmit = vi.fn()
  render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Nový pokoj</DialogTitle>
        <RoomForm
          initialValues={initialValues}
          terms={options.terms ?? TERMS}
          organizationId="org"
          eventId="event"
          isLoading={false}
          fieldError={options.fieldError}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>,
  )
  return { onSubmit }
}

const save = () => userEvent.click(screen.getByRole("button", { name: "Uložit" }))

describe("RoomForm", () => {
  it("requires a label and the bed count", async () => {
    const { onSubmit } = renderForm(EMPTY)
    await save()
    expect(await screen.findByText("Vyplňte označení.")).toBeInTheDocument()
    expect(screen.getByText("Zadejte počet lůžek.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it.each([
    ["0", "Počet lůžek musí být alespoň 1."],
    ["-2", "Počet lůžek musí být alespoň 1."],
    ["1.5", "Počet lůžek musí být celé číslo."],
    ["abc", "Počet lůžek musí být celé číslo."],
    ["1001", "Počet lůžek může být nejvýše 1000."],
  ])("rejects %j beds and keeps the other values", async (beds, message) => {
    const { onSubmit } = renderForm({ ...EMPTY, label: "Pokoj 1", bedCount: beds })
    await save()
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText("Označení")).toHaveValue("Pokoj 1")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("rejects a label of spaces only", async () => {
    const { onSubmit } = renderForm({ ...EMPTY, label: "   ", bedCount: "2" })
    await save()
    expect(await screen.findByText("Vyplňte označení.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("saves a room without any term", async () => {
    const { onSubmit } = renderForm({ ...EMPTY, label: " Chata ", bedCount: "4" })
    await save()
    expect(onSubmit).toHaveBeenCalledWith({ label: "Chata", bedCount: 4, termIds: [] })
  })

  it("sends the terms the room is made available in", async () => {
    const { onSubmit } = renderForm({ ...EMPTY, label: "Pokoj 1", bedCount: "2" })
    await userEvent.click(screen.getByRole("checkbox", { name: /T2/ }))
    await save()
    expect(onSubmit).toHaveBeenCalledWith({
      label: "Pokoj 1",
      bedCount: 2,
      termIds: [T2],
    })
  })

  it("shows the saved availability and lets one term be removed", async () => {
    const { onSubmit } = renderForm({
      label: "Pokoj 1",
      bedCount: "2",
      termIds: TERMS.map((term) => term.id),
    })
    expect(screen.getByRole("checkbox", { name: /T1/ })).toBeChecked()
    await userEvent.click(screen.getByRole("checkbox", { name: /T1/ }))
    await save()
    expect(onSubmit).toHaveBeenCalledWith({
      label: "Pokoj 1",
      bedCount: 2,
      termIds: [T2],
    })
  })

  it("offers adding a term when the event has none", () => {
    renderForm(EMPTY, { terms: [] })
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getByText("Přidat termín")).toBeInTheDocument()
  })

  it("shows a duplicate label from the server at its field and keeps the values", () => {
    renderForm(
      { label: "pokoj 1", bedCount: "3", termIds: [T1] },
      { fieldError: { field: "label", message: "Pokoj s tímto označením už v akci existuje." } },
    )
    expect(screen.getByText("Pokoj s tímto označením už v akci existuje.")).toBeInTheDocument()
    expect(screen.getByLabelText("Označení")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Počet lůžek")).toHaveValue("3")
    expect(screen.getByRole("checkbox", { name: /T1/ })).toBeChecked()
  })
})
