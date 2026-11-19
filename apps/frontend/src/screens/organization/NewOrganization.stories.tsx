import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

const CREATE = "/organizations"

const meta = {
  title: "Screens/Organization/NewOrganization",
  ...screenMeta,
  args: { url: "/organizations/new" },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

async function create({ canvas }: Pick<StoryContext, "canvas">) {
  await userEvent.type(await canvas.findByLabelText("Název organizace"), "Tábor Modrá Hora z. s.")
  await userEvent.click(canvas.getByRole("button", { name: "Založit organizaci" }))
}

/** Creating an organization (S2-03). */
export const NewOrganization: Story = { play: showsHeading("Založit organizaci") }

export const ValidationError: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Založit organizaci" }))
    await showsText("Zadejte název organizace.")
  },
}

export const Creating: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", CREATE))
  },
  play: async (context) => {
    await create(context)
    await expect(context.canvas.getByRole("button", { name: "Založit organizaci" })).toBeDisabled()
  },
}

/** The organizer already has an organization of that name. */
export const NameTaken: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", CREATE, 409))
  },
  play: async (context) => {
    await create(context)
    await showsText("Organizace s tímto názvem už existuje.")
  },
}

export const CreateFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", CREATE))
  },
  play: async (context) => {
    await create(context)
    await showsText("Organizaci se nepodařilo založit. Zkuste to prosím znovu.")
  },
}
