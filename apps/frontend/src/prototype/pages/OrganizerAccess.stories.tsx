import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { ROUTES } from "@/app/routes"
import { DEMO, PASSWORD } from "@/prototype/mockBackend/scenarios"
import { DARK, fill, knownIssues, MOBILE, prototypeMeta, urls } from "@/prototype/prototypeStories"

// Organizer sign-in and sign-up (S2-02): e-mail and password through
// BetterAuth, separate from the participant's magic link.
const meta = {
  ...prototypeMeta,
  title: "Pages/Organizer/Sign in and sign up",
  args: { ...prototypeMeta.args, route: ROUTES.login },
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

export const SignIn: Story = {
  parameters: knownIssues("headerAvatarContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, { "E-mail": DEMO.jana.email, Heslo: PASSWORD })
    await userEvent.click(canvas.getByRole("button", { name: "Přihlásit se" }))
    // Two organizations: the choice opens.
    await expect(await canvas.findByRole("heading", { name: "Vyberte organizaci" })).toBeVisible()
  },
}

export const SignInMobile: Story = { globals: MOBILE }

export const SignInDark: Story = { globals: DARK }

export const WrongPassword: Story = {
  parameters: knownIssues("destructiveAlertContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, { "E-mail": DEMO.jana.email, Heslo: "spatne-heslo" })
    await userEvent.click(canvas.getByRole("button", { name: "Přihlásit se" }))
    await expect(await canvas.findByText("Nesprávný e-mail nebo heslo.")).toBeVisible()
    await expect(canvas.getByLabelText("E-mail")).toHaveValue(DEMO.jana.email)
  },
}

/** A signed-out visit to an event page signs in and returns there. */
export const ReturnsToTheRequestedPage: Story = {
  args: { route: urls.event(DEMO.summerCamp, "/registrations") },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Přihlášení organizátora" }),
    ).toBeVisible()
    await fill(userEvent, canvasElement, { "E-mail": DEMO.jana.email, Heslo: PASSWORD })
    await userEvent.click(canvas.getByRole("button", { name: "Přihlásit se" }))
    await expect(
      await canvas.findByRole("link", { name: "Otevřít přihlášku Anna Nováková" }),
    ).toBeVisible()
  },
}

/** A signed-in organizer never sees the form. */
export const AlreadySignedIn: Story = {
  args: { organizer: "petr" },
  play: async ({ canvas }) => {
    // Petr has one organization, which opens directly.
    await expect(await canvas.findByRole("heading", { name: "Akce a turnusy" })).toBeVisible()
  },
}

/** Exactly three fields; the organization is founded right after. */
export const SignUp: Story = {
  args: { route: ROUTES.signup },
  parameters: knownIssues("headerAvatarContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, {
      Jméno: "Martin Dvořák",
      "E-mail": "martin@akcio.cz",
      Heslo: "dlouhe-heslo",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Zaregistrovat se" }))
    await expect(await canvas.findByText("Zatím nemáte organizaci")).toBeVisible()
  },
}

export const SignUpMobile: Story = { args: { route: ROUTES.signup }, globals: MOBILE }

export const SignUpDark: Story = { args: { route: ROUTES.signup }, globals: DARK }

export const SignUpValidation: Story = {
  args: { route: ROUTES.signup },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, { "E-mail": "neni-email", Heslo: "kratke" })
    await userEvent.click(canvas.getByRole("button", { name: "Zaregistrovat se" }))
    await expect(await canvas.findByText("Zadejte jméno.")).toBeVisible()
    await expect(canvas.getByText("Zadejte e-mail ve správném tvaru.")).toBeVisible()
    await expect(canvas.getByText("Heslo musí mít alespoň 8 znaků.")).toBeVisible()
  },
}

export const EmailTaken: Story = {
  args: { route: ROUTES.signup },
  parameters: knownIssues("destructiveAlertContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, {
      Jméno: "Jana",
      "E-mail": DEMO.jana.email,
      Heslo: PASSWORD,
    })
    await userEvent.click(canvas.getByRole("button", { name: "Zaregistrovat se" }))
    await expect(await canvas.findByText("Účet s tímto e-mailem už existuje.")).toBeVisible()
    await userEvent.click(canvas.getByRole("link", { name: "Přejít na přihlášení" }))
    await expect(
      await canvas.findByRole("heading", { name: "Přihlášení organizátora" }),
    ).toBeVisible()
  },
}
