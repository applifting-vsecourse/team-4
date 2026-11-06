import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { NO_NEEDS } from "@/features/registrations/api/registrationSchemas"
import { RegistrationNeedsFields } from "@/features/registrations/components/RegistrationNeedsFields"

const setup = (defaultValue = NO_NEEDS) => {
  const onChange = vi.fn()
  render(
    <RegistrationNeedsFields
      defaultValue={defaultValue}
      onChange={onChange}
    />,
  )
  return { user: userEvent.setup(), onChange }
}

describe("RegistrationNeedsFields", () => {
  it("never holds “Bez omezení” together with a diet choice", async () => {
    const { user, onChange } = setup()

    await user.click(screen.getByRole("checkbox", { name: "Veganská" }))
    await user.click(screen.getByRole("checkbox", { name: "Bezlepková" }))
    await user.click(screen.getByRole("checkbox", { name: "Bez omezení" }))

    expect(screen.getByRole("checkbox", { name: "Veganská" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Bezlepková" })).not.toBeChecked()
    expect(onChange).toHaveBeenLastCalledWith({
      ...NO_NEEDS,
      hasNoDietRestriction: true,
      diet: [],
    })

    await user.click(screen.getByRole("checkbox", { name: "Vegetariánská" }))

    expect(screen.getByRole("checkbox", { name: "Bez omezení" })).not.toBeChecked()
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_NEEDS, diet: ["vegetarian"] })
  })

  it("lets a transport choice be cleared while the note stays", async () => {
    const { user, onChange } = setup({ ...NO_NEEDS, transportNote: "Z Pardubic" })

    await user.click(screen.getByRole("radio", { name: "Společná doprava" }))
    await user.click(screen.getByRole("button", { name: "Zrušit výběr" }))

    expect(screen.getByRole("radio", { name: "Společná doprava" })).not.toBeChecked()
    expect(screen.queryByRole("button", { name: "Zrušit výběr" })).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({
      ...NO_NEEDS,
      transport: null,
      transportNote: "Z Pardubic",
    })
  })

  it("keeps the diet text and the health text apart", async () => {
    const { user, onChange } = setup()

    await user.type(screen.getByLabelText("Vlastní text ke stravě"), "Bez ořechů")
    await user.type(screen.getByLabelText("Zdravotní omezení"), "Astma")

    expect(onChange).toHaveBeenLastCalledWith({
      ...NO_NEEDS,
      dietNote: "Bez ořechů",
      health: "Astma",
    })
  })
})
