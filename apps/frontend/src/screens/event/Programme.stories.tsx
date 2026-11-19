import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { programmeHandlers } from "@/features/programme/fixtures/handlers"

const PROGRAMME = "/organizations/:organizationId/events/:eventId/terms/:termId/programme"
const FIRST = "Příjezd a ubytování"

const meta = {
  title: "Screens/Event/Programme",
  ...screenMeta,
  args: { url: eventUrl("/programme") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend(), ...programmeHandlers.organizer())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const TIMEOUT = { timeout: 5000 }

/** Opens the dialog of the add button of the day `index` (0 is the first day). */
async function openAddDialog(
  canvas: Parameters<NonNullable<Story["play"]>>[0]["canvas"],
  index = 0,
) {
  const buttons = await canvas.findAllByRole("button", { name: "Přidat položku" }, TIMEOUT)
  await userEvent.click(within(buttons[index]!).getByText("Přidat položku"))
  const dialog = await screen.findByRole("dialog", { name: "Nová položka programu" }, TIMEOUT)
  await waitFor(() => expect(dialog).toBeVisible())
  return dialog
}

/** Every day of the selected term as a row, the ones with items opened (F65-1). */
export const Programme: Story = {
  play: async ({ canvas }) => {
    await showsText(FIRST)
    await expect(await canvas.findByText("Neděle 4. 7. 2027")).toBeVisible()
    await expect(canvas.getByText("Sobota 17. 7. 2027")).toBeVisible()
  },
}

/** The term is chosen in the tabs and stays in the URL. */
export const SecondTerm: Story = {
  args: { url: eventUrl("/programme?term=0190c0de-0000-7000-8000-000000000102") },
  beforeEach: ({ msw }) => {
    msw.use(...programmeHandlers.organizerEmpty())
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { selected: true }, TIMEOUT)).toHaveTextContent(
      "Turnus 2",
    )
    await expect(await canvas.findByText("Neděle 1. 8. 2027")).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", PROGRAMME))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání programu" })).toBeVisible()
  },
}

/** No items yet: every day is still there with its add button. */
export const Empty: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...programmeHandlers.organizerEmpty())
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Neděle 4. 7. 2027")).toBeVisible()
    await expect(canvas.getAllByRole("button", { name: "Přidat položku" })).toHaveLength(14)
  },
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PROGRAMME))
  },
  play: () => showsText("Program se nepodařilo načíst"),
}

/** Added from a day: the date is filled in. */
export const AddItemDialog: Story = {
  play: async ({ canvas }) => {
    const dialog = await openAddDialog(canvas, 1)
    await expect(within(dialog).getByLabelText("Název")).toBeVisible()
    await expect(within(dialog).getByLabelText("Datum")).toHaveTextContent("5. 7. 2027")
  },
}

/** Sent without the required fields. */
export const AddItemInvalid: Story = {
  play: async ({ canvas }) => {
    const dialog = await openAddDialog(canvas)
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))
    await expect(within(dialog).getByLabelText("Název")).toHaveAttribute("aria-invalid", "true")
  },
}

/** The end is not later than the start. */
export const EndBeforeStart: Story = {
  play: async ({ canvas }) => {
    const dialog = await openAddDialog(canvas)
    await userEvent.type(within(dialog).getByLabelText("Název"), "Večeře")
    await userEvent.type(within(dialog).getByLabelText("Začátek"), "19:00")
    await userEvent.type(within(dialog).getByLabelText("Konec"), "18:00")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))
    await showsText("Čas konce musí být pozdější než čas začátku.")
  },
}

export const EditItemDialog: Story = {
  play: async ({ canvas }) => {
    const row = await canvas.findByRole("button", { name: new RegExp(FIRST) }, TIMEOUT)
    await expect(within(row).getByText("Upravit", { exact: true })).toBeVisible()
    await userEvent.click(within(row).getByText(FIRST, { exact: true }))
    const dialog = await screen.findByRole("dialog", { name: "Upravit položku programu" }, TIMEOUT)
    await expect(within(dialog).getByLabelText("Název")).toHaveValue(FIRST)
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(within(dialog).getByRole("button", { name: "Odstranit" })).toBeVisible()
  },
}

export const SaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${PROGRAMME}/:itemId`))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: new RegExp(FIRST) }, TIMEOUT))
    const dialog = await screen.findByRole("dialog", { name: "Upravit položku programu" }, TIMEOUT)
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))
    await showsText("Položku se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

export const DeleteItemDialog: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: new RegExp(FIRST) }, TIMEOUT))
    const edit = await screen.findByRole("dialog", { name: "Upravit položku programu" }, TIMEOUT)
    await userEvent.click(within(edit).getByRole("button", { name: "Odstranit" }))
    await showsText(`Odstranit položku „${FIRST}“?`)
  },
}

export const DeleteFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("delete", `${PROGRAMME}/:itemId`))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: new RegExp(FIRST) }, TIMEOUT))
    const edit = await screen.findByRole("dialog", { name: "Upravit položku programu" }, TIMEOUT)
    await userEvent.click(within(edit).getByRole("button", { name: "Odstranit" }))
    const confirm = (await screen.findAllByRole("dialog", {}, TIMEOUT)).at(-1)!
    await userEvent.click(within(confirm).getByRole("button", { name: "Odstranit" }))
    await showsText("Položku se nepodařilo odstranit. Zkuste to prosím znovu.")
  },
}
