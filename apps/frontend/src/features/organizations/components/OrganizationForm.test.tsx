import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OrganizationForm } from "@/features/organizations/components/OrganizationForm"

describe("OrganizationForm", () => {
  it("requires a name", async () => {
    const onSubmit = vi.fn()
    render(
      <OrganizationForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Založit organizaci" }))
    expect(await screen.findByText("Zadejte název organizace.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("trims the name before submitting", async () => {
    const onSubmit = vi.fn()
    render(
      <OrganizationForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )
    await userEvent.type(screen.getByLabelText("Název organizace"), "  Tábor ")
    await userEvent.click(screen.getByRole("button", { name: "Založit organizaci" }))
    expect(onSubmit).toHaveBeenCalledWith({ name: "Tábor" }, expect.anything())
  })

  it("shows a server-side name error at the field and keeps the input", () => {
    render(
      <OrganizationForm
        isLoading={false}
        nameError="Organizace s tímto názvem už existuje."
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText("Organizace s tímto názvem už existuje.")).toBeInTheDocument()
    expect(screen.getByLabelText("Název organizace")).toHaveAttribute("aria-invalid", "true")
  })
})
