import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageSection } from "@/components/PageSection"

describe("PageSection", () => {
  it("is a region named by its second-level heading", () => {
    render(<PageSection title="Termíny">obsah</PageSection>)

    const region = screen.getByRole("region", { name: "Termíny" })
    expect(screen.getByRole("heading", { level: 2, name: "Termíny" })).toBeInTheDocument()
    expect(region).toHaveTextContent("obsah")
  })

  it("shows its actions and description next to the heading", () => {
    render(
      <PageSection
        title="Pokoje"
        description="Kapacita pro každý termín"
        actions={<button type="button">Přidat pokoj</button>}
      >
        obsah
      </PageSection>,
    )

    const region = screen.getByRole("region", { name: "Pokoje" })
    expect(region).toContainElement(screen.getByRole("button", { name: "Přidat pokoj" }))
    expect(region).toHaveTextContent("Kapacita pro každý termín")
  })

  it("keeps a given heading id, so links can point at the section", () => {
    render(
      <PageSection
        title="Publikace"
        headingId="publication-heading"
      >
        obsah
      </PageSection>,
    )

    expect(screen.getByRole("heading", { name: "Publikace" })).toHaveAttribute(
      "id",
      "publication-heading",
    )
    expect(screen.getByRole("region", { name: "Publikace" })).toBeInTheDocument()
  })

  it("gives two sections distinct names", () => {
    render(
      <>
        <PageSection title="První">a</PageSection>
        <PageSection title="Druhá">b</PageSection>
      </>,
    )

    expect(screen.getByRole("region", { name: "První" })).toHaveTextContent("a")
    expect(screen.getByRole("region", { name: "Druhá" })).toHaveTextContent("b")
  })
})
