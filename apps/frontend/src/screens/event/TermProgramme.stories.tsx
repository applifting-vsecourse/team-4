import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta } from "@/screens/screenMeta"
import { openDialog, showsText } from "@/screens/steps"

import { OPEN_EVENT } from "@/features/events/fixtures/events"
import { programmeHandlers } from "@/features/programme/fixtures/handlers"

const [JULY] = OPEN_EVENT.terms
const PROGRAMME = "/organizations/:organizationId/events/:eventId/terms/:termId/programme"
const FIRST = "Příjezd a ubytování"

const meta = {
  title: "Screens/Event/TermProgramme",
  ...screenMeta,
  args: { url: eventUrl(`/terms/${JULY!.id}/programme`) },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend(), ...programmeHandlers.organizer())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** The programme of one term, by day (F65). */
export const TermProgramme: Story = { play: () => showsText(FIRST) }

/** While loading, the programme reads as empty: no skeleton (as the app renders it). */
export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", PROGRAMME))
  },
  play: () => showsText("Program zatím nemá žádné položky"),
}

export const Empty: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...programmeHandlers.organizerEmpty())
  },
  play: () => showsText("Program zatím nemá žádné položky"),
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PROGRAMME))
  },
  play: () => showsText("Program se nepodařilo načíst."),
}

export const AddItemDialog: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Přidat položku", "Nová položka programu")
    await expect(within(dialog).getByLabelText("Název")).toBeVisible()
  },
}

/** Sent without the required fields. */
export const AddItemInvalid: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Přidat položku", "Nová položka programu")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))
    await expect(within(dialog).getByLabelText("Název")).toHaveAttribute("aria-invalid", "true")
  },
}

export const SaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${PROGRAMME}/:itemId`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, `Upravit položku ${FIRST}`, "Upravit položku programu")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))
    await showsText("Položku se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

export const DeleteItemDialog: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, `Smazat položku ${FIRST}`)
    await expect(within(dialog).getByRole("button", { name: "Smazat" })).toBeVisible()
  },
}

export const DeleteFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("delete", `${PROGRAMME}/:itemId`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, `Smazat položku ${FIRST}`)
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat" }))
    await showsText("Položku se nepodařilo smazat. Zkuste to prosím znovu.")
  },
}

/** A term that does not belong to the event. */
export const TermUnavailable: Story = {
  args: { url: eventUrl("/terms/0190c0de-0000-7000-8000-000000000199/programme") },
  play: () => showsText("Záznam není dostupný"),
}
