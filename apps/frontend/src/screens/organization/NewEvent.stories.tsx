import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const CREATE = "/organizations/:organizationId/events"

const meta = {
  title: "Screens/Organization/NewEvent",
  ...screenMeta,
  args: { url: `/organizations/${ORGANIZATION.id}/events/new` },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

async function create({ canvas }: Pick<StoryContext, "canvas">) {
  await userEvent.type(await canvas.findByLabelText("Název akce"), "Podzimní víkend 2027")
  await userEvent.type(canvas.getByLabelText("Místo"), "Chata Javor, Hlinsko")
  await userEvent.type(canvas.getByLabelText("Popis"), "Víkend v lese pro starší oddíly.")
  await userEvent.click(canvas.getByRole("button", { name: "Vytvořit akci" }))
}

/** Creating an event (S2-04). */
export const NewEvent: Story = { play: showsHeading("Nová akce") }

export const ValidationErrors: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Vytvořit akci" }))
    await showsText("Vyplňte název akce.")
    await showsText("Vyplňte místo.")
    await showsText("Vyplňte popis.")
  },
}

export const Creating: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", CREATE))
  },
  play: async (context) => {
    await create(context)
    await expect(context.canvas.getByRole("button", { name: "Vytvořit akci" })).toBeDisabled()
  },
}

/** The server refuses a value and says why. */
export const Refused: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", CREATE, 400, { message: "Název akce už v organizaci existuje." }))
  },
  play: async (context) => {
    await create(context)
    await showsText("Název akce už v organizaci existuje.")
  },
}

export const CreateFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", CREATE))
  },
  play: async (context) => {
    await create(context)
    await showsText("Akci se nepodařilo vytvořit. Zkuste to prosím znovu.")
  },
}
