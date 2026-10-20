import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  EMPTY_PAYMENT_SETTINGS,
  PaymentSettingsForm,
  toFormValues,
  type PaymentFieldError,
  type PaymentSettingsFormValues,
} from "@/features/events/components/PaymentSettingsForm"

const SAVED: PaymentSettingsFormValues = {
  bankAccountPrefix: "19",
  bankAccountNumber: "2000145399",
  bankCode: "0800",
  paymentDueDays: "14",
}

function renderForm(
  initialValues: PaymentSettingsFormValues,
  options: { fieldError?: PaymentFieldError } = {},
) {
  const onSubmit = vi.fn()
  render(
    <PaymentSettingsForm
      initialValues={initialValues}
      isLoading={false}
      fieldError={options.fieldError}
      onSubmit={onSubmit}
    />,
  )
  return { onSubmit }
}

const save = () =>
  userEvent.click(screen.getByRole("button", { name: "Uložit platební nastavení" }))

describe("PaymentSettingsForm", () => {
  it("requires the account number, bank code and due days", async () => {
    const { onSubmit } = renderForm(EMPTY_PAYMENT_SETTINGS)
    await save()
    expect(await screen.findByText("Vyplňte číslo účtu.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte kód banky.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte splatnost ve dnech.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it.each(["0", "1.5", "-3", "abc", "366"])("rejects %s due days", async (days) => {
    const { onSubmit } = renderForm({ ...SAVED, paymentDueDays: days })
    await save()
    expect(await screen.findByText(/Splatnost/, { selector: "p" })).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits the saved values as numbers and strings", async () => {
    const { onSubmit } = renderForm(SAVED)
    await save()
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        bankAccountPrefix: "19",
        bankAccountNumber: "2000145399",
        bankCode: "0800",
        paymentDueDays: 14,
      }),
    )
  })

  it("sends an empty prefix as none", async () => {
    const { onSubmit } = renderForm({ ...SAVED, bankAccountPrefix: "" })
    await save()
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ bankAccountPrefix: null })),
    )
  })

  it("shows a server rejection at its field and keeps the input", () => {
    renderForm(SAVED, {
      fieldError: {
        field: "bankAccountNumber",
        message: "Číslo účtu není platné, zkontrolujte ho.",
      },
    })
    expect(screen.getByText("Číslo účtu není platné, zkontrolujte ho.")).toBeInTheDocument()
    expect(screen.getByLabelText("Číslo účtu")).toHaveValue("2000145399")
  })

  it("fills the form from saved settings", () => {
    expect(
      toFormValues({
        bankAccountPrefix: null,
        bankAccountNumber: "123457",
        bankCode: "0100",
        paymentDueDays: 7,
      }),
    ).toEqual({
      bankAccountPrefix: "",
      bankAccountNumber: "123457",
      bankCode: "0100",
      paymentDueDays: "7",
    })
  })
})
