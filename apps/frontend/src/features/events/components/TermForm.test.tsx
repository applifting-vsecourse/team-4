import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

import {
  TermForm,
  type TermFieldError,
  type TermFormValues,
} from "@/features/events/components/TermForm"

const EMPTY: TermFormValues = { label: "", startDate: "", endDate: "", price: "" }
const JULY: TermFormValues = {
  label: "1. turnus",
  startDate: "2027-07-01",
  endDate: "2027-07-07",
  price: "7900",
}

function renderForm(initialValues: TermFormValues, options: { fieldError?: TermFieldError } = {}) {
  const onSubmit = vi.fn()
  render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Nový termín</DialogTitle>
        <TermForm
          initialValues={initialValues}
          isLoading={false}
          fieldError={options.fieldError}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>,
  )
  return { onSubmit }
}

const save = () => userEvent.click(screen.getByRole("button", { name: "Uložit termín" }))

describe("TermForm", () => {
  it("requires a label, both dates and a price", async () => {
    const { onSubmit } = renderForm(EMPTY)
    await save()
    expect(await screen.findByText("Vyplňte označení.")).toBeInTheDocument()
    expect(screen.getByText("Vyberte datum začátku.")).toBeInTheDocument()
    expect(screen.getByText("Vyberte datum konce.")).toBeInTheDocument()
    expect(screen.getByText("Zadejte cenu.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("rejects an end before the start", async () => {
    const { onSubmit } = renderForm({ ...JULY, startDate: "2027-07-07", endDate: "2027-07-06" })
    await save()
    expect(await screen.findByText("Konec nesmí být před začátkem.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("accepts a free one-day term", async () => {
    const { onSubmit } = renderForm({
      label: " Výlet ",
      startDate: "2027-07-08",
      endDate: "2027-07-08",
      price: "0",
    })
    await save()
    expect(onSubmit).toHaveBeenCalledWith({
      label: "Výlet",
      startDate: "2027-07-08",
      endDate: "2027-07-08",
      priceMinor: 0,
    })
  })

  it("sends the price in haléře", async () => {
    const { onSubmit } = renderForm(JULY)
    const price = screen.getByLabelText("Cena (Kč)")
    await userEvent.clear(price)
    await userEvent.type(price, "7 900,50")
    await save()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ priceMinor: 790050 }))
  })

  it.each([
    ["-500", "Cena nesmí být záporná."],
    ["10,001", "Cena může mít nejvýše dvě desetinná místa."],
  ])("rejects the price %j", async (input, message) => {
    const { onSubmit } = renderForm({ ...JULY, price: input })
    await save()
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows a server-side overlap at the start date and keeps the values", () => {
    renderForm(JULY, {
      fieldError: { field: "startDate", message: "Překrývá se s termínem „1. turnus“." },
    })
    expect(screen.getByText("Překrývá se s termínem „1. turnus“.")).toBeInTheDocument()
    expect(screen.getByLabelText("Začátek")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Začátek")).toHaveTextContent("1. 7. 2027")
    expect(screen.getByLabelText("Označení")).toHaveValue("1. turnus")
  })
})
