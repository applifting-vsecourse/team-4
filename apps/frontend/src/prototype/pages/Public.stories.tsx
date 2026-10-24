import type { Meta, StoryObj } from "@storybook/react-vite"
import { delay, http, HttpResponse } from "msw"
import { expect } from "storybook/test"

import { MOCK_API } from "@/prototype/mockBackend/handlers"
import { DEMO } from "@/prototype/mockBackend/scenarios"
import { DARK, fill, knownIssues, MOBILE, prototypeMeta, urls } from "@/prototype/prototypeStories"

// Public area: the landing page and the direct registration link of an event
// (S2-06–S2-08). Every story runs the real routes on the mock backend.
const meta = {
  ...prototypeMeta,
  title: "Pages/Public",
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

export const Landing: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { level: 1 })).toBeVisible()
    await expect(canvas.getAllByRole("link", { name: /Moje přihlášky/ }).length).toBeGreaterThan(0)
  },
}

export const LandingMobile: Story = { globals: MOBILE }

export const LandingDark: Story = { globals: DARK }

/** The form of an open event; availability is decided by the server on submit. */
export const RegistrationForm: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("heading", { name: DEMO.summerCamp.name })).toBeVisible()
    await userEvent.click(canvas.getByRole("checkbox", { name: /1\. turnus/ }))
    await userEvent.click(canvas.getByRole("checkbox", { name: /2\. turnus/ }))
    await expect(canvas.getByText("9 000 Kč")).toBeVisible()
  },
}

export const RegistrationFormMobile: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  globals: MOBILE,
}

export const RegistrationFormDark: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  globals: DARK,
}

/** Nothing is sent while a field is invalid. */
export const RegistrationValidation: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Odeslat přihlášku" }))
    await expect(await canvas.findByText("Vyberte alespoň jeden termín.")).toBeVisible()
    await expect(canvas.getByText("Vyplňte jméno.")).toBeVisible()
    await expect(canvas.getByText("Vyplňte telefon.")).toBeVisible()
  },
}

/** 1. turnus has free beds, 2. turnus is full: one application, both outcomes. */
export const RegistrationSubmitted: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: /1\. turnus/ }))
    await userEvent.click(canvas.getByRole("checkbox", { name: /2\. turnus/ }))
    await fill(userEvent, canvasElement, {
      Jméno: "Petra",
      Příjmení: "Malá",
      "E-mail": "petra.mala@example.cz",
      Telefon: "+420 777 123 456",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
    await expect(await canvas.findByRole("heading", { name: "Přihláška je uložená" })).toBeVisible()
    await expect(canvas.getByText("1000062")).toBeVisible()
  },
}

/** The e-mail already has a registration for this event; nothing of it is shown. */
export const AlreadyRegistered: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: /1\. turnus/ }))
    await fill(userEvent, canvasElement, {
      Jméno: "Anna",
      Příjmení: "Nováková",
      "E-mail": DEMO.anna.email,
      Telefon: "+420 601 234 567",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
    await expect(await canvas.findByText("Přihláška s tímto e-mailem již existuje")).toBeVisible()
  },
}

/** A draft and an unknown link look the same (Wireframy V1). */
export const EventUnavailable: Story = {
  args: { route: urls.publicEvent(DEMO.winterCamp) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Akce není dostupná")).toBeVisible()
  },
}

export const EventLoadError: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  parameters: knownIssues("destructiveAlertContrast"),
  beforeEach: ({ msw }) => {
    msw.use(http.get(MOCK_API.publicEvent, () => HttpResponse.json({}, { status: 503 })))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Akci se nepodařilo načíst")).toBeVisible()
  },
}

/** The submit stays pending: the button says so and cannot be pressed twice. */
export const Submitting: Story = {
  args: { route: urls.publicEvent(DEMO.summerCamp) },
  beforeEach: ({ msw }) => {
    msw.use(http.post(`${MOCK_API.publicEvent}/registrations`, () => delay("infinite")))
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: /1\. turnus/ }))
    await fill(userEvent, canvasElement, {
      Jméno: "Petra",
      Příjmení: "Malá",
      "E-mail": "petra.mala@example.cz",
      Telefon: "+420 777 123 456",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Odeslat přihlášku" }))
    await expect(await canvas.findByRole("button", { name: "Odesílám přihlášku…" })).toBeDisabled()
  },
}
