import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SignInForm } from "@/features/auth/components/SignInForm"

describe("SignInForm", () => {
  it("submits the password unchanged, including surrounding spaces", async () => {
    const onSubmit = vi.fn()
    render(
      <SignInForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )
    await userEvent.type(screen.getByLabelText("E-mail"), "jan@novak.cz")
    await userEvent.type(screen.getByLabelText("Heslo"), " tajne heslo ")
    await userEvent.click(screen.getByRole("button", { name: "Přihlásit se" }))

    expect(onSubmit).toHaveBeenCalledWith(
      { email: "jan@novak.cz", password: " tajne heslo " },
      expect.anything(),
    )
  })
})
