import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { authHandlers } from "@/features/auth/fixtures/handlers"

const meta = {
  title: "Screens/Public/Signup",
  ...screenMeta,
  args: { url: "/signup" },
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signedOut())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

async function signUp({ canvas }: Pick<StoryContext, "canvas">) {
  await userEvent.type(await canvas.findByLabelText("Jméno"), "Jana Nováková")
  await userEvent.type(canvas.getByLabelText("E-mail"), "jana@modrahora.example")
  await userEvent.type(canvas.getByLabelText("Heslo"), "tajne-heslo")
  await userEvent.click(canvas.getByRole("button", { name: "Zaregistrovat se" }))
}

/** Organizer registration (S2-02). */
export const Signup: Story = { play: showsHeading("Registrace organizátora") }

export const ValidationErrors: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Zaregistrovat se" }))
    await showsText("Zadejte jméno.")
    await showsText("Heslo musí mít alespoň 8 znaků.")
  },
}

export const SigningUp: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.pending())
  },
  play: async (context) => {
    await signUp(context)
    await expect(context.canvas.getByRole("button", { name: "Zaregistrovat se" })).toBeDisabled()
  },
}

/** The e-mail has an account: the error and a way to the sign-in. */
export const EmailTaken: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signUpRefused())
  },
  play: async (context) => {
    await signUp(context)
    await showsText("Účet s tímto e-mailem už existuje.")
    await expect(context.canvas.getByRole("link", { name: "Přejít na přihlášení" })).toBeVisible()
  },
}

export const SignUpFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signUpRefused("INTERNAL_SERVER_ERROR"))
  },
  play: async (context) => {
    await signUp(context)
    await showsText("Registrace se nezdařila. Zkuste to prosím znovu.")
  },
}
