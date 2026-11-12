import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { authHandlers } from "@/features/auth/fixtures/handlers"

const meta = {
  title: "Screens/Public/Login",
  ...screenMeta,
  args: { url: "/login" },
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signedOut())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

async function signIn({ canvas }: Pick<StoryContext, "canvas">) {
  await userEvent.type(await canvas.findByLabelText("E-mail"), "jana@modrahora.example")
  await userEvent.type(canvas.getByLabelText("Heslo"), "tajne-heslo")
  await userEvent.click(canvas.getByRole("button", { name: "Přihlásit se" }))
}

/** Organizer sign-in (S2-01). */
export const Login: Story = { play: showsHeading("Přihlášení organizátora") }

export const ValidationErrors: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Přihlásit se" }))
    await showsText("Zadejte e-mail.")
    await showsText("Zadejte heslo.")
  },
}

export const SigningIn: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.pending())
  },
  play: async (context) => {
    await signIn(context)
    await expect(context.canvas.getByRole("button", { name: "Přihlásit se" })).toBeDisabled()
  },
}

export const InvalidCredentials: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signInRefused())
  },
  play: async (context) => {
    await signIn(context)
    await showsText("Nesprávný e-mail nebo heslo.")
  },
}

export const SignInFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...authHandlers.signInRefused("INTERNAL_SERVER_ERROR"))
  },
  play: async (context) => {
    await signIn(context)
    await showsText("Přihlášení se nezdařilo. Zkuste to prosím znovu.")
  },
}
