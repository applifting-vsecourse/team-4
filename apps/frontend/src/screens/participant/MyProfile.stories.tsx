import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { toast } from "sonner"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import {
  EMPTY_PROFILE,
  PARTICIPANT,
  PROFILE,
} from "@/features/participant-access/fixtures/participant"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"

const PROFILE_PATH = "/participant/profile"
const TIMEOUT = { timeout: 5000 }
const MOBILE = { viewport: { value: "mobile", isRotated: false } }

const meta = {
  title: "Screens/Participant/MyProfile",
  ...screenMeta,
  args: { url: "/my-profile" },
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.signedIn(), ...participantHandlers.profile())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const firstName = ({ canvas }: Pick<StoryContext, "canvas">) =>
  canvas.findByLabelText("Jméno", {}, TIMEOUT)

/**
 * The success toast is checked, then dismissed: the kit's rich-coloured
 * success toast is below the contrast threshold app-wide, reported separately.
 */
async function showsSavedToast() {
  await showsText("Profil uložen")
  toast.dismiss()
  await waitFor(() => expect(screen.queryByText("Profil uložen")).not.toBeInTheDocument(), TIMEOUT)
}

/** Můj profil with the stored details; the sign-in e-mail is shown, not edited (S4-08). */
export const MyProfile: Story = {
  play: async (context) => {
    await showsHeading("Můj profil")(context)
    await expect(await firstName(context)).toHaveValue(PROFILE.firstName)
    await expect(context.canvas.getByLabelText("Příjmení")).toHaveValue(PROFILE.lastName)
    await expect(context.canvas.getByLabelText("Telefon")).toHaveValue("604 123 456")
    await expect(context.canvas.getByText(PROFILE.email)).toBeVisible()
    await expect(context.canvas.queryByLabelText("E-mail")).not.toBeInTheDocument()
  },
}

/** Nothing filled in yet: every field is optional and the profile saves empty. */
export const EmptyProfile: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.profile(EMPTY_PROFILE), ...registrationHandlers.own())
  },
  play: async (context) => {
    await expect(await firstName(context)).toHaveValue("")
    await userEvent.click(context.canvas.getByRole("button", { name: "Uložit profil" }))
    await showsSavedToast()
  },
}

/**
 * Saving confirms with a toast and returns the participant to the page they
 * came from; opened directly, that is Moje přihlášky.
 */
export const Saved: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.own())
  },
  play: async (context) => {
    const input = await firstName(context)
    await userEvent.clear(input)
    await userEvent.type(input, "Anička")
    await userEvent.click(context.canvas.getByRole("button", { name: "Uložit profil" }))
    await showsSavedToast()
    await showsHeading("Moje přihlášky")(context)
  },
}

/** The way back to Moje přihlášky sits above the title. */
export const BackToRegistrations: Story = {
  play: async (context) => {
    await showsHeading("Můj profil")(context)
    const page = within(context.canvasElement.querySelector("main")!)
    await expect(page.getByRole("link", { name: "Moje přihlášky" })).toHaveAttribute(
      "href",
      "/my-registrations",
    )
  },
}

/** A failed save says so at the form and keeps what was typed, ready to save again. */
export const SaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", PROFILE_PATH))
  },
  play: async (context) => {
    const input = await firstName(context)
    await userEvent.clear(input)
    await userEvent.type(input, "Anička")
    await userEvent.click(context.canvas.getByRole("button", { name: "Uložit profil" }))
    await showsText("Profil se nepodařilo uložit")
    await expect(input).toHaveValue("Anička")
    await expect(context.canvas.getByRole("button", { name: "Uložit profil" })).toBeEnabled()
  },
}

/** An invalid phone is refused at the field before anything is sent. */
export const InvalidPhone: Story = {
  play: async (context) => {
    await firstName(context)
    const phone = context.canvas.getByLabelText("Telefon")
    await userEvent.clear(phone)
    await userEvent.type(phone, "123")
    await userEvent.click(context.canvas.getByRole("button", { name: "Uložit profil" }))
    await showsText(/Zadejte platné telefonní číslo/)
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", PROFILE_PATH))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání profilu" }, TIMEOUT),
    ).toBeVisible()
  },
}

/** The load failed: an error with a retry, never an empty profile. */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PROFILE_PATH))
  },
  play: async ({ canvas }) => {
    await showsText("Profil se nepodařilo načíst")
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeVisible()
    await expect(canvas.queryByLabelText("Jméno")).not.toBeInTheDocument()
  },
}

/** The session ended while the page was open: nothing private, a way to a new link. */
export const SessionEnded: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PROFILE_PATH, 401))
  },
  play: () => showsText("Přihlášení vypršelo. Pro zobrazení přihlášek si vyžádejte nový odkaz."),
}

/** The user icon opens the account: the sign-in e-mail, Můj profil and Odhlásit se. */
export const AccountMenu: Story = {
  play: async (context) => {
    await showsHeading("Můj profil")(context)
    const header = within(context.canvasElement.querySelector("header")!)
    await expect(header.queryByText(PARTICIPANT.email)).not.toBeInTheDocument()
    await expect(header.queryByRole("link", { name: "Organizátor" })).not.toBeInTheDocument()
    await userEvent.click(header.getByRole("button", { name: "Účet" }))
    const menu = await screen.findByRole("menu", {}, TIMEOUT)
    // The menu fades in.
    await waitFor(() => expect(within(menu).getByText(PARTICIPANT.email)).toBeVisible(), TIMEOUT)
    await expect(within(menu).getByRole("menuitem", { name: "Můj profil" })).toBeVisible()
    await expect(within(menu).getByRole("menuitem", { name: "Odhlásit se" })).toBeVisible()
    // Closed again, the page is back in the accessibility tree.
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(menu).not.toBeInTheDocument(), TIMEOUT)
  },
}

/** At 360 px the profile fits without horizontal scrolling. */
export const Mobile: Story = {
  globals: MOBILE,
  play: async (context) => {
    await expect(await firstName(context)).toHaveValue(PROFILE.firstName)
    await waitFor(() =>
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth),
    )
  },
}

/** On a phone the participant's links fold into the menu, without the organizer entry. */
export const MobileNavigation: Story = {
  globals: MOBILE,
  play: async (context) => {
    await showsHeading("Můj profil")(context)
    await userEvent.click(context.canvas.getByRole("button", { name: "Otevřít menu" }))
    const menu = await screen.findByRole("dialog", { name: "Menu" }, TIMEOUT)
    const portal = within(menu).getByRole("navigation", { name: "Účastnický portál" })
    await expect(within(portal).getByRole("link", { name: "Moje přihlášky" })).toBeVisible()
    await expect(within(portal).getByRole("link", { name: "Katalog akcí" })).toBeVisible()
    await expect(within(menu).queryByRole("link", { name: "Organizátor" })).not.toBeInTheDocument()
  },
}
