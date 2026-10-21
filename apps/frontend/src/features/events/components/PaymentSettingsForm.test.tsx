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
  paymentReminderDays: "14",
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
  it("requires the account number, bank code and reminder days", async () => {
    const { onSubmit } = renderForm(EMPTY_PAYMENT_SETTINGS)
    await save()
    expect(await screen.findByText("Vyplňte číslo účtu.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte kód banky.")).toBeInTheDocument()
    expect(screen.getByText("Vyplňte počet dní do připomenutí platby.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // Saved settings can only be saved after a change, so each case edits a field.
  const changeDays = async (days: string) => {
    const field = screen.getByLabelText(/Počet dní do připomenutí platby/)
    await userEvent.clear(field)
    await userEvent.type(field, days)
  }

  it.each(["0", "1.5", "-3", "abc", "2147483648"])("rejects %s reminder days", async (days) => {
    const { onSubmit } = renderForm(SAVED)
    await changeDays(days)
    await save()
    expect(await screen.findByText(/připomenutí platby/i, { selector: "p" })).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits the changed values as numbers and strings", async () => {
    const { onSubmit } = renderForm(SAVED)
    await changeDays("30")
    await save()
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        bankAccountPrefix: "19",
        bankAccountNumber: "2000145399",
        bankCode: "0800",
        paymentReminderDays: 30,
      }),
    )
  })

  it("accepts a reminder period of more than a year", async () => {
    const { onSubmit } = renderForm(SAVED)
    await changeDays("366")
    await save()
    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ paymentReminderDays: 366 })),
    )
  })

  it("sends a cleared prefix as none", async () => {
    const { onSubmit } = renderForm(SAVED)
    await userEvent.clear(screen.getByLabelText("Předčíslí (nepovinné)"))
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
        paymentReminderDays: 7,
      }),
    ).toEqual({
      bankAccountPrefix: "",
      bankAccountNumber: "123457",
      bankCode: "0100",
      paymentReminderDays: "7",
    })
  })
  describe("save button", () => {
    const saveButton = () => screen.getByRole("button", { name: "Uložit platební nastavení" })

    it("is active on the first setup, even with an empty form", () => {
      renderForm(EMPTY_PAYMENT_SETTINGS)
      expect(saveButton()).toBeEnabled()
    })

    it("is disabled for saved settings until a value changes", async () => {
      renderForm(SAVED)
      expect(saveButton()).toBeDisabled()
      await userEvent.type(screen.getByLabelText(/Počet dní do připomenutí platby/), "0")
      expect(saveButton()).toBeEnabled()
    })

    it("is disabled again when the original values are restored", async () => {
      renderForm(SAVED)
      const days = screen.getByLabelText(/Počet dní do připomenutí platby/)
      await userEvent.clear(days)
      await userEvent.type(days, "30")
      expect(saveButton()).toBeEnabled()
      await userEvent.clear(days)
      await userEvent.type(days, "14")
      expect(saveButton()).toBeDisabled()
    })
  })
})
