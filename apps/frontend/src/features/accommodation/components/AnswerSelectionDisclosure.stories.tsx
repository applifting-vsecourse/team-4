import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { AnswerSelectionDisclosure } from "@/features/accommodation/components/AnswerSelectionDisclosure"

const answers = [
  { value: "other", label: "Jiná odpověď s delším názvem pro ověření zalamování" },
  { value: "decline", label: "Nechci uvést svou odpověď" },
  { value: "first", label: "První možnost" },
]

function DisclosureExamples() {
  const [manual, setManual] = useState(["other", "decline"])
  const [ignored, setIgnored] = useState<string[]>([])

  return (
    <div className="max-w-md space-y-6 p-6">
      <AnswerSelectionDisclosure
        id="story-manual-placement"
        title="Komu určit pokoj ručně"
        summary={[
          ...answers.filter(({ value }) => manual.includes(value)).map(({ label }) => label),
          "Chybějící odpověď",
        ].join(" · ")}
        options={answers}
        selectedValues={manual}
        explanation="Účastníkům bez vyplněné odpovědi určíte pokoj vždy ručně."
        onSelectionChange={(value, isSelected) =>
          setManual((current) =>
            isSelected ? [...current, value] : current.filter((candidate) => candidate !== value),
          )
        }
      />
      <AnswerSelectionDisclosure
        id="story-ignored-answers"
        title="Ignorované odpovědi"
        summary={
          ignored.length
            ? answers
                .filter(({ value }) => ignored.includes(value))
                .map(({ label }) => label)
                .join(" · ")
            : "Žádné"
        }
        options={answers}
        selectedValues={ignored}
        explanation="Vybrané odpovědi ani prázdné odpovědi neovlivní návrh."
        onSelectionChange={(value, isSelected) =>
          setIgnored((current) =>
            isSelected ? [...current, value] : current.filter((candidate) => candidate !== value),
          )
        }
      />
    </div>
  )
}

const meta = {
  title: "Components/Accommodation/Answer selection disclosure",
  component: DisclosureExamples,
} satisfies Meta<typeof DisclosureExamples>

export default meta
type Story = StoryObj<typeof meta>

export const SharedDisclosure: Story = {
  play: async ({ canvas }) => {
    const view = canvas
    const manual = view.getByRole("button", { name: /Komu určit pokoj ručně/ })
    const ignored = view.getByRole("button", { name: /Ignorované odpovědi/ })

    await expect(manual).toHaveAttribute("aria-expanded", "false")
    await expect(ignored).toHaveAttribute("aria-expanded", "false")
    await expect(manual).toHaveTextContent("Chybějící odpověď")
    await expect(manual).toHaveTextContent("Jiná odpověď s delším názvem pro ověření zalamování")
    await expect(ignored).toHaveTextContent("Žádné")

    manual.focus()
    await expect(manual).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(manual).toHaveAttribute("aria-expanded", "true")
    const first = view.getByRole("checkbox", {
      name: "První možnost",
    })
    await userEvent.click(first)
    await expect(manual).toHaveTextContent("První možnost")
    await expect(
      view.getByText("Účastníkům bez vyplněné odpovědi určíte pokoj vždy ručně."),
    ).toBeVisible()

    ignored.focus()
    await userEvent.keyboard("{Enter}")
    await expect(ignored).toHaveAttribute("aria-expanded", "true")
    await expect(
      view.getByText("Vybrané odpovědi ani prázdné odpovědi neovlivní návrh."),
    ).toBeVisible()
    const ignoredChoice = view.getAllByRole("checkbox", {
      name: "Nechci uvést svou odpověď",
    })[1]!
    await userEvent.click(ignoredChoice)
    await expect(ignored).toHaveTextContent("Nechci uvést svou odpověď")
    await userEvent.click(ignoredChoice)
    await expect(ignored).toHaveTextContent("Žádné")
  },
}

export const SharedDisclosureDark: Story = {
  globals: { theme: "dark" },
  play: SharedDisclosure.play,
}
