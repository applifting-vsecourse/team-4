import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"
import { PUBLIC_EVENT, PUBLIC_ID } from "@/features/public-events/fixtures/publicEvent"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import {
  CONFIRMED_RESULT,
  makeRegistrationResult,
} from "@/features/registrations/fixtures/publicRegistration"

const EVENT = `/public/events/:publicId`
const SUBMIT = `/public/events/:publicId/registrations`

const meta = {
  title: "Screens/Public/Registration",
  ...screenMeta,
  args: { url: `/e/${PUBLIC_ID}/registration` },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.detail(), ...registrationHandlers.submitted())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** Fills the form for Turnus 1 the way a visitor would, then sends it. */
async function register({ canvas }: Pick<StoryContext, "canvas">) {
  await userEvent.click(
    await canvas.findByRole("checkbox", { name: /Turnus 1/ }, { timeout: 5000 }),
  )
  await userEvent.type(canvas.getByLabelText(/^Jméno/), "Tereza")
  await userEvent.type(canvas.getByLabelText(/^Příjmení/), "Nováková")
  await userEvent.type(canvas.getByLabelText(/^E-mail/), "tereza.novakova@example.cz")
  await userEvent.type(canvas.getByLabelText(/^Telefon/), "+420 777 123 456")
  await userEvent.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
}

/** Registration form of an event with open registration, linking to its detail (S2-06, S2-07, F55). */
export const Form: Story = {
  play: async (context) => {
    await showsHeading(PUBLIC_EVENT.name)(context)
    const back = within(context.canvasElement).getByRole("link", { name: "Zpět na detail akce" })
    await expect(back).toHaveAttribute("href", `/e/${PUBLIC_ID}`)
  },
}

/** "Jiná odpověď" opens a field for the participant's own words (F64). */
export const OwnGenderAnswer: Story = {
  play: async (context) => {
    await showsHeading(PUBLIC_EVENT.name)(context)
    const canvas = within(context.canvasElement)
    const words = { name: "Vlastní odpověď (nepovinné)" }
    await expect(canvas.queryByRole("textbox", words)).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("radio", { name: "Jiná odpověď" }))
    await userEvent.type(canvas.getByRole("textbox", words), "nebinární")
    await expect(canvas.getByRole("textbox", words)).toHaveValue("nebinární")
  },
}

/** Sent empty: every required field explains itself, nothing is sent. */
export const ValidationErrors: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Odeslat přihlášku" }, { timeout: 5000 }),
    )
    await showsText("Vyberte alespoň jeden termín.")
    await showsText("Vyplňte jméno.")
    await showsText("Vyplňte telefon.")
  },
}

export const Submitting: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", SUBMIT))
  },
  play: async (context) => {
    await register(context)
    await expect(
      await context.canvas.findByRole("button", { name: "Odesílám přihlášku…" }),
    ).toBeDisabled()
  },
}

/** Saved: both terms wait for the organizer, nothing to pay yet (S2-08). */
export const SubmittedPending: Story = {
  play: async (context) => {
    await register(context)
    await expect(
      await context.canvas.findByRole("heading", { name: "Přihláška je uložená" }),
    ).toBeVisible()
  },
}

/** Saved with a confirmed term: the amount due, payment details and the QR link. */
export const SubmittedWithPayment: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.submitted(CONFIRMED_RESULT))
  },
  play: async (context) => {
    await register(context)
    await expect(
      await context.canvas.findByRole("img", { name: "QR kód s odkazem na platbu" }),
    ).toBeVisible()
  },
}

/** Saved, but every chosen term is full: the visitor is a substitute. */
export const SubmittedWaitlisted: Story = {
  beforeEach: ({ msw }) => {
    const result = makeRegistrationResult()
    msw.use(
      ...registrationHandlers.submitted({
        ...result,
        terms: result.terms.map((term) => ({ ...term, status: "waitlisted" })),
      }),
    )
  },
  play: async (context) => {
    await register(context)
    await expect(
      await context.canvas.findByRole("heading", { name: "Přihláška je uložená" }),
    ).toBeVisible()
    await showsText("Pokud se místo uvolní a bude vám přiděleno, dáme vám vědět e-mailem.")
  },
}

/** The e-mail already has a registration for the event: nothing new is saved. */
export const AlreadyRegistered: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", SUBMIT, 409, { code: "already_registered" }))
  },
  play: async (context) => {
    await register(context)
    await showsText("Přihláška s tímto e-mailem již existuje")
  },
}

/** Registration closed while the form was open. */
export const RegistrationUnavailable: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", SUBMIT, 404))
  },
  play: async (context) => {
    await register(context)
    await showsText("Přihlašování není dostupné")
  },
}

/** A chosen term no longer exists: explained at the term selection. */
export const UnknownTerm: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("post", SUBMIT, 400, {
        code: "term_unknown",
        message: "Vybraný termín už není v nabídce. Vyberte termíny znovu.",
      }),
    )
  },
  play: async (context) => {
    await register(context)
    await showsText("Vybraný termín už není v nabídce. Vyberte termíny znovu.")
  },
}

export const SubmitFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", SUBMIT))
  },
  play: async (context) => {
    await register(context)
    await showsText(
      "Přihlášku se nepodařilo odeslat. Vyplněné údaje zůstaly zachované, zkuste to prosím znovu.",
    )
  },
}

/** The event has no term yet: nothing to register for. */
export const NoTerms: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.detail({ ...PUBLIC_EVENT, terms: [] }))
  },
  play: () => showsText("Akce nemá termíny k výběru"),
}

/** A draft, missing or malformed link: the same unavailable page. */
export const EventUnavailable: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", EVENT, 404))
  },
  play: () => showsText("Akce není dostupná"),
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", EVENT))
  },
  play: () => showsText("Akci se nepodařilo načíst"),
}
