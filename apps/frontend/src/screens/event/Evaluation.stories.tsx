import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

const meta = {
  title: "Screens/Event/Evaluation",
  ...screenMeta,
  args: { url: eventUrl("/registrations?view=evaluation") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

function textLeft(element: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(element)
  return range.getBoundingClientRect().left
}

/** Přihlášky → Vyhodnocení: the current proposal of Turnus 1 with its queues and order (S3-01). */
export const Evaluation: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Pořadí")(context)
    const { canvas } = context
    const row = within(canvas.getByRole("row", { name: /Anna Procházková/ }))
    const status = within(row.getByRole("cell", { name: /^Náhradník$/ })).getByText("Náhradník")
    const proposal = within(row.getByRole("cell", { name: /^Vhodný$/ })).getByText("Vhodný")
    await expect(
      Math.abs(textLeft(status) - textLeft(canvas.getByRole("columnheader", { name: "Stav" }))),
    ).toBeLessThanOrEqual(1)
    await expect(
      Math.abs(textLeft(proposal) - textLeft(canvas.getByRole("columnheader", { name: "Návrh" }))),
    ).toBeLessThanOrEqual(1)

    const rank = canvas.getByRole("columnheader", { name: "Pořadí" })
    const inset = textLeft(rank) - rank.getBoundingClientRect().left
    await expect(inset).toBeCloseTo(parseFloat(getComputedStyle(rank).paddingLeft))
  },
}
