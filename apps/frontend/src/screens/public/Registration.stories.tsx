import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { EMPTY_PROFILE, PROFILE } from "@/features/participant-access/fixtures/participant"
import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"
import {
  PUBLIC_EVENT,
  PUBLIC_EVENT_WITHOUT_CONDITIONS,
  PUBLIC_ID,
} from "@/features/public-events/fixtures/publicEvent"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import {
  CONFIRMED_RESULT,
  makeRegistrationResult,
} from "@/features/registrations/fixtures/publicRegistration"
import { SCHOOL, TROOP } from "@/features/registrations/fixtures/questions"

const EVENT = `/public/events/:publicId`
const SUBMIT = `/public/events/:publicId/registrations`

const meta = {
  title: "Screens/Public/Registration",
  ...screenMeta,
  args: { url: `/e/${PUBLIC_ID}/registration` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...participantHandlers.signedOut(),
      ...publicEventHandlers.detail(),
      ...registrationHandlers.submitted(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const CONFIRMATION = { name: /Potvrzuji, že jsem si přečetl\/a podmínky účasti/ }
const CONDITIONS_REQUIRED = "Potvrďte, že jste si přečetli podmínky účasti."

/** Fills the form for Turnus 1 the way a visitor would, then sends it. */
async function register({ canvas }: Pick<StoryContext, "canvas">, isConfirming = true) {
  await userEvent.click(
    await canvas.findByRole("checkbox", { name: /Turnus 1/ }, { timeout: 5000 }),
  )
  await userEvent.type(canvas.getByLabelText(/^Jméno/), "Tereza")
  await userEvent.type(canvas.getByLabelText(/^Příjmení/), "Nováková")
  await userEvent.type(canvas.getByLabelText(/^E-mail/), "tereza.novakova@example.cz")
  await userEvent.type(canvas.getByLabelText(/^Telefon/), "+420 777 123 456")
  if (isConfirming) await userEvent.click(canvas.getByRole("checkbox", CONFIRMATION))
  await userEvent.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
}

/** Registration form of an event with open registration, linking to its detail (S2-06, S2-07, F55). */
export const Form: Story = {
  play: async (context) => {
    await showsHeading(PUBLIC_EVENT.name)(context)
    const back = within(context.canvasElement).getByRole("link", { name: "Zpět na detail akce" })
    await expect(back).toHaveAttribute("href", `/e/${PUBLIC_ID}`)
    await expect(
      context.canvas.queryByRole("region", { name: "Otázky k účasti" }),
    ).not.toBeInTheDocument()
    await expect(context.canvas.queryByRole("radio", { name: "Žena" })).not.toBeInTheDocument()
    await expect(
      context.canvas.getByRole("region", { name: "Doprava, strava a zdraví" }),
    ).toBeVisible()
  },
}

/** A signed-in participant's profile prefills the contact details, which stay editable (S4-08). */
export const PrefilledFromProfile: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.profile())
  },
  play: async ({ canvas }) => {
    const firstName = await canvas.findByLabelText(/^Jméno/, {}, { timeout: 5000 })
    await expect(firstName).toHaveValue(PROFILE.firstName)
    await expect(canvas.getByLabelText(/^Příjmení/)).toHaveValue(PROFILE.lastName)
    await expect(canvas.getByLabelText(/^E-mail/)).toHaveValue(PROFILE.email)
    await expect(canvas.getByLabelText(/^Telefon/)).toHaveValue("604 123 456")
    await userEvent.clear(firstName)
    await userEvent.type(firstName, "Tereza")
    await expect(firstName).toHaveValue("Tereza")
  },
}

/** An incomplete profile prefills only what it holds and the sign-in e-mail (S4-08). */
export const PrefilledFromEmptyProfile: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.profile(EMPTY_PROFILE))
  },
  play: async ({ canvas }) => {
    const email = await canvas.findByLabelText(/^E-mail/, {}, { timeout: 5000 })
    await expect(email).toHaveValue(EMPTY_PROFILE.email)
    await expect(canvas.getByLabelText(/^Jméno/)).toHaveValue("")
    await expect(canvas.getByLabelText(/^Telefon/)).toHaveValue("")
  },
}

/** The terms start collapsed beside an unchecked confirmation (F07). */
export const ConditionsCollapsed: Story = {
  play: async ({ canvas }) => {
    const toggle = await canvas.findByRole(
      "button",
      { name: "Zobrazit podmínky" },
      { timeout: 5000 },
    )
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getByRole("checkbox", CONFIRMATION)).not.toBeChecked()
    await expect(canvas.queryByText(/Záloha 2 000 Kč/)).not.toBeInTheDocument()
  },
}

/** Opening the terms shows the current text in the form and does not tick the confirmation (F07). */
export const ConditionsExpanded: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Zobrazit podmínky" }, { timeout: 5000 }),
    )
    const conditions = within(canvas.getByRole("region", { name: "Podmínky účasti" }))
    await expect(conditions.getAllByRole("listitem")).toHaveLength(4)
    await expect(conditions.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Věk účastníka 11 až 15 let.",
      "Zdravotní způsobilost potvrzená rodičem při přihlášce.",
      "Záloha 2 000 Kč je splatná do 7 dnů od přihlášení.",
      "Při odhlášení do 30 dnů před začátkem turnusu vracíme celou zálohu, později 50 %.",
    ])
    await expect(canvas.getByRole("checkbox", CONFIRMATION)).not.toBeChecked()
  },
}

/** The confirmation ticked on its own, without opening the terms (F07). */
export const ConditionsConfirmed: Story = {
  play: async ({ canvas }) => {
    const confirmation = await canvas.findByRole("checkbox", CONFIRMATION, { timeout: 5000 })
    await userEvent.click(confirmation)
    await expect(confirmation).toBeChecked()
    await expect(canvas.getByRole("button", { name: "Zobrazit podmínky" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  },
}

/** Without terms there is no checkbox and no link, and the form is sent without confirming (F07). */
export const NoConditions: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.detail(PUBLIC_EVENT_WITHOUT_CONDITIONS))
  },
  play: async (context) => {
    const { canvas } = context
    await canvas.findByRole("checkbox", { name: /Turnus 1/ }, { timeout: 5000 })
    await expect(canvas.queryByRole("checkbox", CONFIRMATION)).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Zobrazit podmínky" })).toBeNull()
    await register(context, false)
    await expect(await canvas.findByRole("heading", { name: "Přihláška je uložená" })).toBeVisible()
  },
}

/** Sent without the confirmation: nothing is sent and the form says what is needed (F07). */
export const ConditionsNotConfirmed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", SUBMIT))
  },
  play: async (context) => {
    await register(context, false)
    await showsText(CONDITIONS_REQUIRED)
    await expect(context.canvas.getByRole("button", { name: "Odeslat přihlášku" })).toBeEnabled()
  },
}

/** The server refuses a submission without the confirmation: explained at the checkbox (F07). */
export const ConditionsRefusedByServer: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("post", SUBMIT, 400, {
        code: "conditions_unconfirmed",
        message: CONDITIONS_REQUIRED,
      }),
    )
  },
  play: async (context) => {
    await register(context)
    await showsText(CONDITIONS_REQUIRED)
  },
}

/** "Jiná odpověď" opens a field for the participant's own words (F64). */
export const OwnGenderAnswer: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.detail({ ...PUBLIC_EVENT_WITHOUT_CONDITIONS, isGenderRequired: true }),
    )
  },
  play: async (context) => {
    await showsHeading(PUBLIC_EVENT.name)(context)
    const participation = within(context.canvas.getByRole("region", { name: "Otázky k účasti" }))
    const words = { name: "Vlastní odpověď (nepovinné)" }
    await expect(participation.queryByRole("textbox", words)).not.toBeInTheDocument()
    await userEvent.click(participation.getByRole("radio", { name: "Jiná odpověď" }))
    await userEvent.type(participation.getByRole("textbox", words), "nebinární")
    await expect(participation.getByRole("textbox", words)).toHaveValue("nebinární")
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

// ─── The organizer's questions (#485) ──────────────────────────────────────

const WITH_QUESTIONS = {
  ...PUBLIC_EVENT_WITHOUT_CONDITIONS,
  questions: [SCHOOL, TROOP],
}

/** A required question needs an answer; an optional one can stay "Neuvádím". */
export const Questions: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.detail(WITH_QUESTIONS))
  },
  play: async (context) => {
    const { canvas } = context
    const section = within(
      await canvas.findByRole("region", { name: "Otázky k účasti" }, { timeout: 5000 }),
    )
    await expect(section.getByText("Povinné", { selector: "[data-slot=badge]" })).toBeVisible()
    const radios = section.getAllByRole("radio")
    await expect(radios[0]).toHaveAccessibleName("ZŠ Lipová")
    await expect(radios[1]).toHaveAccessibleName("ZŠ Dubová")
    await expect(section.queryByText("Pohlaví pro ubytování")).not.toBeInTheDocument()
    await expect(section.queryByText("Pro rozdělení do pokojů.")).not.toBeInTheDocument()
    await expect(section.getAllByRole("radiogroup")).toHaveLength(2)
    await expect(section.getByRole("radio", { name: "Neuvádím" })).toBeChecked()
    await register(context, false)
    await showsText("Vyberte odpověď.")
    await userEvent.click(section.getByRole("radio", { name: "ZŠ Dubová" }))
    await userEvent.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
    await expect(await canvas.findByRole("heading", { name: "Přihláška je uložená" })).toBeVisible()
  },
}

/** Every organizer question is optional. */
export const OptionalQuestions: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.detail({
        ...PUBLIC_EVENT_WITHOUT_CONDITIONS,
        questions: [TROOP],
      }),
    )
  },
  play: async ({ canvas }) => {
    const section = within(
      await canvas.findByRole("region", { name: "Otázky k účasti" }, { timeout: 5000 }),
    )
    await expect(section.getByText("Nepovinné", { selector: "[data-slot=badge]" })).toBeVisible()
    await expect(section.getByRole("radiogroup")).not.toHaveAttribute("aria-required", "true")
    await expect(section.getByRole("radio", { name: "Neuvádím" })).toBeVisible()
  },
}

/** The organizer changed the questions after the form opened: asked again, values kept. */
export const QuestionsChanged: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.detail(WITH_QUESTIONS),
      ...failOn("post", SUBMIT, 409, {
        code: "questions_changed",
        message: "Otázky přihlášky se mezitím změnily. Zkontrolujte odpovědi a odešlete je znovu.",
      }),
    )
  },
  play: async (context) => {
    const { canvas } = context
    await userEvent.click(
      await canvas.findByRole("radio", { name: "ZŠ Lipová" }, { timeout: 5000 }),
    )
    await register(context, false)
    await showsText(
      "Otázky přihlášky se mezitím změnily. Zkontrolujte odpovědi a odešlete je znovu.",
    )
    await expect(canvas.getByLabelText(/^Jméno/)).toHaveValue("Tereza")
  },
}

/** Rooms are split by gender (PO feedback on #485): an answer is needed, "Nechci uvést" counts. */
export const GenderRequired: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.detail({ ...PUBLIC_EVENT_WITHOUT_CONDITIONS, isGenderRequired: true }),
    )
  },
  play: async (context) => {
    const { canvas } = context
    const participation = within(
      await canvas.findByRole("region", { name: "Otázky k účasti" }, { timeout: 5000 }),
    )
    await expect(
      participation.getByText("Povinné", { selector: "[data-slot=badge]" }),
    ).toBeVisible()
    await expect(participation.getByText("Pro rozdělení do pokojů.")).toBeVisible()
    await expect(participation.getByRole("radiogroup")).toHaveAttribute("aria-required", "true")
    await register(context, false)
    await showsText("Vyberte odpověď, i kdyby to mělo být „Nechci uvést“.")
    await userEvent.click(canvas.getByRole("radio", { name: "Nechci uvést" }))
    await userEvent.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
    await expect(await canvas.findByRole("heading", { name: "Přihláška je uložená" })).toBeVisible()
  },
}
