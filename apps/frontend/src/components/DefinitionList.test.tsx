import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"

describe("DefinitionList", () => {
  it("pairs each label with its value as dt and dd", () => {
    render(
      <DefinitionList>
        <DefinitionRow label="E-mail">jana@example.cz</DefinitionRow>
        <DefinitionRow label="Telefon">+420777123456</DefinitionRow>
      </DefinitionList>,
    )

    const terms = screen.getAllByRole("term")
    const definitions = screen.getAllByRole("definition")
    expect(terms.map((term) => term.textContent)).toEqual(["E-mail", "Telefon"])
    expect(definitions.map((definition) => definition.textContent)).toEqual([
      "jana@example.cz",
      "+420777123456",
    ])
  })

  it("keeps the dt and dd pairs in the stacked layout", () => {
    render(
      <DefinitionList layout="stacked">
        <DefinitionRow label="Popis">Letní tábor u rybníka</DefinitionRow>
      </DefinitionList>,
    )

    expect(screen.getByRole("term")).toHaveTextContent("Popis")
    expect(screen.getByRole("definition")).toHaveTextContent("Letní tábor u rybníka")
  })
})
