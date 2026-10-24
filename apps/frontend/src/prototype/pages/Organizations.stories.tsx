import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, within } from "storybook/test"

import { ROUTES } from "@/app/routes"
import { MOCK_API } from "@/prototype/mockBackend/handlers"
import { DEMO } from "@/prototype/mockBackend/scenarios"
import {
  DARK,
  DESKTOP,
  fill,
  knownIssues,
  MOBILE,
  prototypeMeta,
  screenOf,
  urls,
  waitForOverlaysToClose,
} from "@/prototype/prototypeStories"

// The organizer's organizations and "Akce a turnusy" (S2-02, S2-03, #133):
// one organization opens directly, several offer a choice, none offers
// founding the first. Foreign organizations look like missing ones.
const meta = {
  ...prototypeMeta,
  title: "Pages/Organizer/Organizations",
  args: { ...prototypeMeta.args, organizer: "jana", route: ROUTES.organizations },
  globals: DESKTOP,
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

export const ChooseOrganization: Story = {
  play: async ({ canvas, userEvent }) => {
    const list = await canvas.findByRole("list", { name: "Vaše organizace" })
    await expect(within(list).getAllByRole("listitem")).toHaveLength(2)
    await userEvent.click(within(list).getByRole("link", { name: /Skautský oddíl Rosa/ }))
    await expect(await canvas.findByRole("heading", { name: "Akce a turnusy" })).toBeVisible()
  },
}

export const ChooseOrganizationMobile: Story = {
  globals: MOBILE,
  parameters: knownIssues("headerAvatarContrast"),
}

export const ChooseOrganizationDark: Story = { globals: { ...DESKTOP, ...DARK } }

/** Petr has one organization: it opens straight away. */
export const SingleOrganization: Story = {
  args: { organizer: "petr" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(DEMO.robotics.name)).toBeVisible()
  },
}

/** Eva has none yet. */
export const NoOrganization: Story = {
  args: { organizer: "eva" },
  parameters: knownIssues("headerAvatarContrast"),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Zatím nemáte organizaci")).toBeVisible()
  },
}

export const NewOrganization: Story = {
  args: { route: ROUTES.newOrganization },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, { "Název organizace": "Oddíl Vlčata" })
    await userEvent.click(await canvas.findByRole("button", { name: "Založit organizaci" }))
    await expect(await canvas.findByText("Zatím žádné akce")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Přepnout organizaci" })).toHaveTextContent(
      "Oddíl Vlčata",
    )
  },
}

export const DuplicateOrganizationName: Story = {
  args: { route: ROUTES.newOrganization },
  parameters: knownIssues("headerAvatarContrast"),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, { "Název organizace": DEMO.rosa.name })
    await userEvent.click(canvas.getByRole("button", { name: "Založit organizaci" }))
    await expect(await canvas.findByText("Organizace s tímto názvem už existuje.")).toBeVisible()
  },
}

/** "Akce a turnusy": the organizer's dashboard of one organization. */
export const Events: Story = {
  args: { route: urls.organization(DEMO.rosa.id) },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("link", { name: `Otevřít akci ${DEMO.winterCamp.name}` }),
    ).toBeVisible()
    await expect(canvas.getAllByRole("row")).toHaveLength(4)
  },
}

/** On a phone the sidebar opens as a sheet. */
export const EventsMobile: Story = {
  args: { route: urls.organization(DEMO.rosa.id) },
  globals: MOBILE,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Otevřít menu" }))
    await expect(
      await screenOf(canvasElement).findByRole("link", { name: "Akce a turnusy" }),
    ).toBeVisible()
  },
}

export const EventsDark: Story = {
  args: { route: urls.organization(DEMO.rosa.id) },
  globals: { ...DESKTOP, ...DARK },
}

export const NoEvents: Story = {
  args: { route: urls.organization(DEMO.palava.id) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Zatím žádné akce")).toBeVisible()
  },
}

/** Switching is navigation: the organization in the URL is the active one. */
export const SwitchOrganization: Story = {
  args: { route: urls.organization(DEMO.rosa.id) },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Přepnout organizaci" }))
    await userEvent.click(
      await screenOf(canvasElement).findByRole("menuitem", { name: DEMO.palava.name }),
    )
    await expect(await canvas.findByText("Zatím žádné akce")).toBeVisible()
    await waitForOverlaysToClose(canvasElement)
  },
}

/** Another organizer's organization, opened by its URL (S2-03). */
export const ForeignOrganization: Story = {
  args: { route: urls.organization(DEMO.technoklub.id) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Záznam není dostupný")).toBeVisible()
    await expect(canvas.queryByText(DEMO.robotics.name)).toBeNull()
  },
}

/**
 * A failed load (500) currently shows the same "Záznam není dostupný" as a
 * foreign organization, without a retry; the event pages tell the two apart.
 */
export const EventsLoadError: Story = {
  args: { route: urls.organization(DEMO.rosa.id) },
  beforeEach: ({ msw }) => {
    msw.use(http.get(MOCK_API.events, () => HttpResponse.json({}, { status: 500 })))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Záznam není dostupný")).toBeVisible()
  },
}
