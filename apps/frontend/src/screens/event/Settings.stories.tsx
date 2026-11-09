import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor, within } from "storybook/test"

import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"

import { DRAFT_EVENT } from "@/features/events/fixtures/events"
import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const meta = {
  title: "Screens/Event/Settings",
  ...screenMeta,
  args: { url: eventUrl("/settings") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Terms, registration and payment settings of an event (S2-04, S2-06, S2-09). */
export const Settings: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Termíny a ceny")(context)
    const title = "Schvalování změn přihlášek"
    const approval = within(context.canvas.getByRole("region", { name: title }))
    await expect(approval.getByRole("heading", { name: title, level: 2 })).toBeVisible()
    const field = () => approval.queryByRole("textbox", { name: "Počet dní před začátkem termínu" })
    const trigger = approval.getByRole("button", { name: title })
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(field()).toBeVisible()
    await context.userEvent.click(within(trigger).getByText(title))
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(trigger).toHaveFocus()
    await waitFor(() =>
      expect(field()?.closest("[data-collapsible-section-content]")).toHaveAttribute("inert"),
    )
    await expect(field()).toBeInTheDocument()
    await context.userEvent.keyboard("{Enter}")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(field()?.closest("[data-collapsible-section-content]")).not.toHaveAttribute(
      "inert",
    )
    await expect(field()).toBeVisible()
  },
}

export const Draft: StoryObj<typeof meta> = {
  args: { url: `/organizations/${ORGANIZATION.id}/events/${DRAFT_EVENT.id}/settings` },
  play: async ({ canvas, userEvent }) => {
    const automation = within(await canvas.findByRole("region", { name: "Automatizace" }))
    const presentation = within(canvas.getByRole("region", { name: "Veřejná prezentace" }))
    const presentationSave = presentation.getByRole("button", { name: /^Uložit$/ })
    const presentationContent = presentationSave.closest<HTMLElement>(
      "[data-collapsible-section-content]",
    )
    if (!presentationContent) throw new Error("Presentation content wrapper is missing")
    await waitFor(async () => {
      await expect(presentationContent.scrollHeight).toBeLessThanOrEqual(
        presentationContent.clientHeight + 1,
      )
      await expect(getComputedStyle(presentationContent).overflow).toBe("visible")
    })
    await expect(presentationSave).toBeVisible()
    const approval = canvas.getByRole("button", { name: "Uložit schvalování změn" })
    const rightEdge = approval.getBoundingClientRect().right

    for (const action of [
      canvas.getByRole("button", { name: "Otevřít přihlašování" }),
      canvas.getByRole("button", { name: "Uložit platební nastavení" }),
      presentationSave,
      automation.getByRole("button", { name: /^Uložit$/ }),
    ]) {
      await expect(action.getBoundingClientRect().right).toBeCloseTo(rightEdge)
    }

    const payment = within(canvas.getByRole("region", { name: "Platební údaje" }))
    const trigger = payment.getByRole("button", { name: "Platební údaje" })
    const account = payment.getByLabelText("Číslo účtu", { exact: true })
    const accountContent = account.closest<HTMLElement>("[data-collapsible-section-content]")
    if (!accountContent) throw new Error("Payment content wrapper is missing")
    await userEvent.type(account, "12345678")
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await waitFor(() => expect(accountContent).toHaveAttribute("inert"))
    await expect(getComputedStyle(accountContent).clipPath).toMatch(/-\d+px/)

    const registration = within(canvas.getByRole("region", { name: "Přihlašování" }))
    await userEvent.click(registration.getByRole("link", { name: "Doplnit" }))
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(accountContent).not.toHaveAttribute("inert")
    await waitFor(() => expect(account).toBeVisible())
    await waitFor(() => expect(getComputedStyle(accountContent).clipPath).toBe("none"))
    await expect(account).toHaveValue("12345678")
  },
}
