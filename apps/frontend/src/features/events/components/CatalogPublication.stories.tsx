import type { Meta, StoryObj } from "@storybook/react-vite"

import { PublicationSection } from "@/features/events/components/PublicationSection"

const meta = {
  title: "Designs/F54-1 Catalog publication",
  component: PublicationSection,
} satisfies Meta<typeof PublicationSection>

export default meta

/** Toggle that lists the event in the public catalog. */
export const PublicationToggle: StoryObj<typeof meta> = {}
