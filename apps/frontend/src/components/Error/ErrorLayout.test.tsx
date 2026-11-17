import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ErrorLayout } from "@/components/Error/ErrorLayout"
import { Main, WithinMain } from "@/components/MainLandmark"

describe("ErrorLayout", () => {
  it("is the page's main landmark when nothing surrounds it", () => {
    render(<ErrorLayout title="Stránku se nepodařilo načíst" />)

    expect(screen.getByRole("main")).toHaveTextContent("Stránku se nepodařilo načíst")
  })

  it("opens no second main inside a layout's main", () => {
    render(
      <Main>
        <ErrorLayout title="Stránku se nepodařilo načíst" />
      </Main>,
    )

    expect(screen.getAllByRole("main")).toHaveLength(1)
  })

  it("opens no main inside content of a main rendered elsewhere", () => {
    render(
      <WithinMain>
        <ErrorLayout title="Stránku se nepodařilo načíst" />
      </WithinMain>,
    )

    expect(screen.queryByRole("main")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Stránku se nepodařilo načíst" })).toBeVisible()
  })
})
