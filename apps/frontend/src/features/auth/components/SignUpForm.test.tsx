import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SignUpForm } from "@/features/auth/components/SignUpForm"

describe("SignUpForm", () => {
  it("asks for exactly name, e-mail and password", () => {
    render(
      <SignUpForm
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getAllByRole("textbox")).toHaveLength(2)
    expect(screen.getByLabelText("Heslo")).toBeInTheDocument()
  })

  it("shows errors at the fields and does not submit invalid values", async () => {
    const onSubmit = vi.fn()
    render(
      <SignUpForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )
    await userEvent.type(screen.getByLabelText("E-mail"), "not-an-email")
    await userEvent.type(screen.getByLabelText("Heslo"), "short")
    await userEvent.click(screen.getByRole("button", { name: "Zaregistrovat se" }))

    expect(await screen.findByText("Zadejte jméno.")).toBeInTheDocument()
    expect(screen.getByText("Zadejte e-mail ve správném tvaru.")).toBeInTheDocument()
    expect(screen.getByText("Heslo musí mít alespoň 8 znaků.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits valid values", async () => {
    const onSubmit = vi.fn()
    render(
      <SignUpForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )
    await userEvent.type(screen.getByLabelText("Jméno"), "Jan Novák")
    await userEvent.type(screen.getByLabelText("E-mail"), "jan@novak.cz")
    await userEvent.type(screen.getByLabelText("Heslo"), "dost-dlouhe-heslo")
    await userEvent.click(screen.getByRole("button", { name: "Zaregistrovat se" }))

    expect(onSubmit).toHaveBeenCalledWith(
      { name: "Jan Novák", email: "jan@novak.cz", password: "dost-dlouhe-heslo" },
      expect.anything(),
    )
  })
})
