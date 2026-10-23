import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { organizationKeys } from "@/features/organizations/api/organizationQueryOptions"
import { type Organization } from "@/features/organizations/api/organizationSchemas"
import { BackToEventsButton } from "@/features/organizations/components/BackToEventsButton"

const ORGANIZATION: Organization = {
  id: "0190c0de-0000-7000-8000-000000000001",
  name: "Skautský oddíl Rosa",
}

const meta = {
  component: BackToEventsButton,
  parameters: { queryData: [[organizationKeys.list(), [ORGANIZATION]]] },
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", { name: "Zpět na přehled akcí" })
    await expect(link).toHaveAttribute("href", `/organizations/${ORGANIZATION.id}`)
  },
} satisfies Meta<typeof BackToEventsButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Mobile: Story = {
  globals: { viewport: { value: "mobile360" } },
}

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async (context) => {
    await meta.play(context)
    await expect(document.documentElement.classList.contains("dark")).toBe(true)
  },
}

export const WithoutOrganization: Story = {
  parameters: { queryData: [[organizationKeys.list(), []]] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "Založit organizaci" })).toBeVisible()
  },
}
