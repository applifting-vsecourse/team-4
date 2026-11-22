import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, screen, userEvent } from "storybook/test"

import { apiUrl, failOn, neverAnswer } from "@/screens/msw"
import { organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { OPEN_EVENT } from "@/features/events/fixtures/events"
import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const CREATE = "/organizations"

const meta = {
  title: "Screens/Organization/NewOrganization",
  ...screenMeta,
  args: { url: "/organizations/new" },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

async function create({ canvas }: Pick<StoryContext, "canvas">) {
  await userEvent.type(await canvas.findByLabelText("Název organizace"), "Tábor Modrá Hora z. s.")
  await userEvent.click(canvas.getByRole("button", { name: "Založit organizaci" }))
}

/** Creating an organization (S2-03). */
export const NewOrganization: Story = { play: showsHeading("Založit organizaci") }

/** The first organization can be created from the empty organizer overview. */
export const FromEmptyOverview: Story = {
  args: { url: "/organizations" },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
    msw.use(http.get(apiUrl("/organizations"), () => HttpResponse.json([])))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("link", { name: "Založit organizaci" }))
    await showsText("Založit organizaci")
    await expect(
      canvas.getByRole("navigation", { name: "Navigace organizace a akce" }),
    ).toBeVisible()
    await expect(canvas.getByRole("link", { name: "Přehled organizací" })).toBeVisible()
    await expect(canvas.queryByText("Akce a turnusy")).not.toBeInTheDocument()
    await expect(canvas.queryByText("Reporty")).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("link", { name: "Zpět na seznam organizací" }))
    await showsText("Zatím nemáte organizaci")
  },
}

/** The same workspace shell is used when the organizer already has organizations. */
export const WithOrganizations: Story = {
  play: async ({ canvas }) => {
    await showsHeading("Založit organizaci")({ canvas })
    await expect(canvas.getByRole("link", { name: "akc.io" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Přepnout organizaci" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Uživatelské menu" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Toggle theme" })).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Zrušit" })).not.toBeInTheDocument()
    const card = canvas
      .getByRole("button", { name: "Založit organizaci" })
      .closest("form")
      ?.closest('[data-slot="card"]')
    await expect(card).toBeVisible()
    await expect(card).toHaveClass("max-w-md", "bg-card")
  },
}

/** Direct visits return to the organization list. */
export const BackToOrganizationList: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("link", { name: "Zpět na seznam organizací" }))
    await showsHeading("Vyberte organizaci")({ canvas })
  },
}

/** The back link always returns to the organization list when opened from a workspace. */
export const BackToOrganizationListFromWorkspace: Story = {
  args: { url: `/organizations/${ORGANIZATION.id}/` },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Přepnout organizaci" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Založit organizaci" }))
    await expect(await canvas.findByLabelText("Název organizace")).toBeVisible()
    await userEvent.click(canvas.getByRole("link", { name: "Zpět na seznam organizací" }))
    await showsHeading("Vyberte organizaci")({ canvas })
  },
}

/** Successful creation lands in the new organization's event list. */
export const CreatedOrganization: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...organizerBackend(),
      http.post(apiUrl("/organizations"), () =>
        HttpResponse.json({ id: ORGANIZATION.id, name: "Nový spolek" }),
      ),
    )
  },
  play: async (context) => {
    await userEvent.type(await context.canvas.findByLabelText("Název organizace"), "Nový spolek")
    await userEvent.click(context.canvas.getByRole("button", { name: "Založit organizaci" }))
    await showsText("Akce a turnusy")
    await expect(context.canvas.getByText(OPEN_EVENT.name)).toBeVisible()
    await expect(context.canvas.getAllByText(ORGANIZATION.name).length).toBeGreaterThan(0)
  },
}

export const ValidationError: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Založit organizaci" }))
    await showsText("Zadejte název organizace.")
  },
}

export const Creating: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", CREATE))
  },
  play: async (context) => {
    await create(context)
    await expect(context.canvas.getByRole("button", { name: "Založit organizaci" })).toBeDisabled()
  },
}

/** The organizer already has an organization of that name. */
export const NameTaken: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", CREATE, 409))
  },
  play: async (context) => {
    await create(context)
    await showsText("Organizace s tímto názvem už existuje.")
    await expect(context.canvas.getByLabelText("Název organizace")).toHaveValue(
      "Tábor Modrá Hora z. s.",
    )
  },
}

export const CreateFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", CREATE))
  },
  play: async (context) => {
    await create(context)
    await showsText("Organizaci se nepodařilo založit. Zkuste to prosím znovu.")
    await expect(context.canvas.getByLabelText("Název organizace")).toHaveValue(
      "Tábor Modrá Hora z. s.",
    )
  },
}
