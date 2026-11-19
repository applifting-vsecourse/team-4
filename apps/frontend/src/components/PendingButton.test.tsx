import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PendingButton } from "@/components/PendingButton"

describe("PendingButton", () => {
  it("is enabled and shows its icon while idle", () => {
    render(
      <PendingButton
        isPending={false}
        icon={<span data-testid="icon" />}
      >
        Uložit
      </PendingButton>,
    )

    expect(screen.getByRole("button", { name: "Uložit" })).toBeEnabled()
    expect(screen.getByTestId("icon")).toBeInTheDocument()
  })

  it("is disabled with a spinner in place of its icon while pending, keeping its name", () => {
    render(
      <PendingButton
        isPending
        icon={<span data-testid="icon" />}
      >
        Uložit
      </PendingButton>,
    )

    const button = screen.getByRole("button", { name: "Uložit" })
    expect(button).toBeDisabled()
    expect(button.querySelector(".animate-spin")).not.toBeNull()
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument()
  })

  it("stays disabled when the caller disables it", () => {
    render(
      <PendingButton
        isPending={false}
        disabled
      >
        Uložit
      </PendingButton>,
    )

    expect(screen.getByRole("button", { name: "Uložit" })).toBeDisabled()
  })
})
