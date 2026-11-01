import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { PublicationSection } from "@/features/events/components/PublicationSection"

const meta = {
  title: "Designs/F54-1 Catalog publication",
  component: PublicationSection,
  args: { isPublished: false, onChange: () => undefined },
} satisfies Meta<typeof PublicationSection>

export default meta

type Story = StoryObj<typeof meta>

/** Toggle that lists the event in the public catalog. */
export const PublicationToggle: Story = {
  render: function Render(args) {
    const [isPublished, setIsPublished] = useState(args.isPublished)
    return (
      <PublicationSection
        {...args}
        isPublished={isPublished}
        onChange={setIsPublished}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole("switch", {
      name: "Zveřejnit ve veřejném katalogu",
    })
    await expect(toggle).not.toBeChecked()
    await userEvent.click(toggle)
    await expect(toggle).toBeChecked()
  },
}

/** The event is listed in the catalog. */
export const Published: Story = { args: { isPublished: true } }

/** The change is being saved. */
export const Saving: Story = { args: { isPublished: false, isPending: true } }

/** The change failed: the switch keeps the saved state and the organizer can retry. */
export const SaveFailed: Story = {
  args: {
    isPublished: false,
    errorMessage: "Změnu publikace se nepodařilo uložit. Zkuste to prosím znovu.",
  },
}
