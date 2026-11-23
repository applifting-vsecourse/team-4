import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { PARTICIPANT } from "@/features/participant-access/fixtures/participant"
import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"

const meta = {
  title: "Screens/Public/Catalog",
  ...screenMeta,
  args: { url: "/events" },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const MOBILE = { viewport: { value: "mobile", isRotated: false } }

/** Published events of all organizations; each card leads to its detail (F54-2a). */
export const Catalog: Story = {
  globals: { theme: "light" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsHeading("Katalog akcí")(context)
    const canvas = within(context.canvasElement)
    const filters = canvas.getByRole("button", { name: "Filtry (0)" })
    await expect(filters).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.queryByLabelText("Místo")).not.toBeInTheDocument()
    const link = await canvas.findByRole("link", { name: "Letní tábor Modrá Hora 2027" })
    await expect(link).toHaveAttribute("href", "/e/letni-tabor-2027")
    await expect(canvas.getAllByText("Spolek Modrá Hora")).toHaveLength(2)
    await expect(canvas.getByText(/Turnus 1: 4\. 7\. – 17\. 7\. 2027/)).toBeInTheDocument()
    for (const label of ["Otevřeno", "Uzavřeno", "Připravujeme"]) {
      await expect(
        canvas.getAllByText(label, { selector: '[data-slot="badge"]' }),
      ).not.toHaveLength(0)
    }
    await expect(canvas.getByRole("link", { name: "Zimní víkend v horách" })).toHaveAttribute(
      "href",
      "/e/zimni-vikend-2027",
    )
    filters.focus()
    await expect(context.canvasElement.ownerDocument.activeElement).toBe(filters)
    await userEvent.keyboard("{Enter}")
    await expect(filters).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByLabelText("Termín od")).toBeInTheDocument()
    await userEvent.keyboard("{Enter}")
    await expect(filters).toHaveAttribute("aria-expanded", "false")
  },
}

/** All registration labels remain readable on a 360 px public card grid. */
export const MobileRegistrationBadges: Story = {
  globals: { ...MOBILE, theme: "light" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async ({ canvas, canvasElement }) => {
    await showsHeading("Katalog akcí")({ canvas })
    for (const label of ["Otevřeno", "Uzavřeno", "Připravujeme"]) {
      await expect(
        canvas.getAllByText(label, { selector: '[data-slot="badge"]' }),
      ).not.toHaveLength(0)
    }
    await expect(canvas.getByRole("link", { name: "Zimní víkend v horách" })).toHaveAttribute(
      "href",
      "/e/zimni-vikend-2027",
    )
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(360)
  },
}

/** Semantic badge colours are also checked under the dark theme. */
export const DarkRegistrationBadges: Story = {
  globals: { theme: "dark" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async ({ canvas, canvasElement }) => {
    await showsHeading("Katalog akcí")({ canvas })
    const badges = canvasElement.querySelectorAll('[data-slot="badge"]')
    await expect(badges).toHaveLength(4)
    await expect(canvas.getAllByText("Otevřeno", { selector: '[data-slot="badge"]' })).toHaveLength(
      2,
    )
    await expect(canvas.getAllByText("Uzavřeno", { selector: '[data-slot="badge"]' })).toHaveLength(
      1,
    )
    await expect(
      canvas.getAllByText("Připravujeme", { selector: '[data-slot="badge"]' }),
    ).toHaveLength(1)
    await expect(
      canvas.getByRole("link", { name: "Podzimní víkend pro mladé organizátory" }),
    ).toHaveAttribute("href", "/e/podzimni-vikend-2027")
  },
}

/** The compact controls stack cleanly at the public mobile viewport (360 px). */
export const MobileLayout: Story = {
  globals: MOBILE,
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const search = await canvas.findByRole("searchbox", { name: "Hledat akci" })
    const filters = canvas.getByRole("button", { name: "Filtry (0)" })
    const searchField = search.closest<HTMLElement>("[data-slot='field']")
    if (!searchField) throw new Error("Vyhledávání nemá kontejner pole.")

    await expect(canvasElement.ownerDocument.defaultView?.innerWidth).toBe(360)
    await expect(filters.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      searchField.getBoundingClientRect().bottom,
    )
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(360)
  },
}

/** A signed-in participant keeps the same account menu on the public catalog. */
export const SignedInAccount: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList(), ...participantHandlers.signedIn())
  },
  play: async ({ canvas, canvasElement }) => {
    await showsHeading("Katalog akcí")({ canvas })
    const header = within(canvasElement.querySelector("header")!)
    await userEvent.click(await header.findByRole("button", { name: "Účet" }))
    const menu = await within(document.body).findByRole("menu")
    await waitFor(async () => {
      await expect(within(menu).getByText(PARTICIPANT.email)).toBeVisible()
      for (const label of ["Oznámení", "Můj profil", "Odhlásit se"]) {
        await expect(within(menu).getByRole("menuitem", { name: new RegExp(label) })).toBeVisible()
      }
    })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(within(document.body).queryByRole("menu")).not.toBeInTheDocument())
  },
}

/** At 360 px the account and hamburger sit to the right of the logo. */
export const MobileSignedInAccount: Story = {
  globals: MOBILE,
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList(), ...participantHandlers.signedIn())
  },
  play: async ({ canvas, canvasElement }) => {
    await showsHeading("Katalog akcí")({ canvas })
    const header = within(canvasElement.querySelector("header")!)
    const account = await header.findByRole("button", { name: "Účet" })
    const hamburger = header.getByRole("button", { name: "Otevřít menu" })
    await expect(account).toBeVisible()
    await expect(account.getBoundingClientRect().right).toBeLessThan(
      hamburger.getBoundingClientRect().left,
    )
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(360)
  },
}

/** The mobile header reserves the account position until session validation completes. */
export const LoadingParticipantSession: Story = {
  globals: MOBILE,
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList(), ...neverAnswer("get", "/participant/me"))
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání účtu" })).toBeVisible()
    const header = canvasElement.querySelector("header")!
    const account = header.querySelector('[role="status"]')!
    const menu = within(header).getByRole("button", { name: "Otevřít menu" })
    await expect(account.getBoundingClientRect().right).toBeLessThan(
      menu.getBoundingClientRect().left,
    )
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(360)
  },
}

/** Signed-out visitors still find Moje přihlášky inside the mobile menu. */
export const MobileSignedOutNavigation: Story = {
  globals: MOBILE,
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList(), ...participantHandlers.signedOut())
  },
  play: async ({ canvas, canvasElement }) => {
    await showsHeading("Katalog akcí")({ canvas })
    const header = within(canvasElement.querySelector("header")!)
    await expect(header.queryByRole("button", { name: "Účet" })).not.toBeInTheDocument()
    await userEvent.click(header.getByRole("button", { name: "Otevřít menu" }))
    const dialog = await within(document.body).findByRole("dialog", { name: "Menu" })
    await expect(within(dialog).getByRole("link", { name: "Moje přihlášky" })).toBeVisible()
  },
}

/** Desktop keeps the current navigation and account on the same row. */
export const DarkDesktopAccount: Story = {
  globals: { theme: "dark" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList(), ...participantHandlers.signedIn())
  },
  play: async ({ canvas, canvasElement }) => {
    await showsHeading("Katalog akcí")({ canvas })
    const header = within(canvasElement.querySelector("header")!)
    await expect(await header.findByRole("button", { name: "Účet" })).toBeVisible()
    await expect(header.getByRole("link", { name: "Organizátor" })).toBeVisible()
    await expect(header.getByRole("button", { name: "Toggle theme" })).toBeVisible()
  },
}

/**
 * Filters combined from the URL: every one of them must match (F54-2b). The
 * search starts empty, so typing narrows the filtered list further.
 */
export const FilterCombination: Story = {
  args: { url: "/events?place=praha&open=true" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsHeading("Katalog akcí")(context)
    const canvas = within(context.canvasElement)
    const filters = canvas.getByRole("button", { name: "Filtry (2)" })
    await expect(filters).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getByRole("searchbox", { name: "Hledat akci" })).toHaveValue("")
    await userEvent.click(filters)
    await expect(filters).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByLabelText("Místo")).toHaveValue("praha")
    await expect(
      canvas.getByRole("switch", { name: "Pouze akce s otevřeným přihlašováním" }),
    ).toBeChecked()
    await expect(
      await canvas.findByRole("link", { name: "Příměstský tábor Město hrou" }),
    ).toHaveAttribute("href", "/e/mesto-hrou-2027")
    for (const name of ["Letní tábor Modrá Hora 2027", "Podzimní víkend pro mladé organizátory"]) {
      await expect(canvas.queryByRole("link", { name })).not.toBeInTheDocument()
    }
    await userEvent.click(filters)
    await expect(filters).toHaveAttribute("aria-expanded", "false")
    await expect(
      canvas.getByRole("link", { name: "Příměstský tábor Město hrou" }),
    ).toBeInTheDocument()
  },
}

/**
 * The switch hides published events whose registration is not open. The check
 * turns it off again, so the story ends on the whole catalog, ready to search.
 */
export const OnlyOpenRegistration: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsHeading("Katalog akcí")(context)
    const canvas = within(context.canvasElement)
    const notOpen = "Podzimní víkend pro mladé organizátory"
    await expect(await canvas.findByRole("link", { name: notOpen })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Zrušit filtry" })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Filtry (0)" }))
    const onlyOpen = canvas.getByRole("switch", { name: "Pouze akce s otevřeným přihlašováním" })
    await userEvent.click(onlyOpen)
    await waitFor(() =>
      expect(canvas.queryByRole("link", { name: notOpen })).not.toBeInTheDocument(),
    )
    await expect(
      canvas.getByRole("link", { name: "Letní tábor Modrá Hora 2027" }),
    ).toBeInTheDocument()
    // The clear button appears and goes away without moving the results.
    await expect(await canvas.findByRole("button", { name: "Zrušit filtry" })).toBeVisible()
    const filters = canvas.getByRole("button", { name: "Filtry (1)" })

    await userEvent.click(onlyOpen)
    await expect(await canvas.findByRole("link", { name: notOpen })).toBeInTheDocument()
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Zrušit filtry" })).not.toBeInTheDocument(),
    )
    await expect(filters).toHaveAccessibleName("Filtry (0)")
  },
}

/**
 * A one-day period matches an event whose term shares that day (here the first
 * day of Turnus 2). The end cannot be picked before the start.
 */
export const PeriodFilter: Story = {
  args: { url: "/events?from=2027-08-01&to=2027-08-01" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async (context) => {
    await showsHeading("Katalog akcí")(context)
    const canvas = within(context.canvasElement)
    const filters = canvas.getByRole("button", { name: "Filtry (1)" })
    await expect(filters).toHaveAttribute("aria-expanded", "false")
    await expect(
      await canvas.findByRole("link", { name: "Letní tábor Modrá Hora 2027" }),
    ).toBeInTheDocument()
    for (const name of ["Příměstský tábor Město hrou", "Podzimní víkend pro mladé organizátory"]) {
      await expect(canvas.queryByRole("link", { name })).not.toBeInTheDocument()
    }

    await userEvent.click(filters)
    await userEvent.click(canvas.getByRole("button", { name: "Termín do" }))
    const body = within(context.canvasElement.ownerDocument.body)
    await expect(await body.findByRole("grid")).toBeInTheDocument()
    const day = (date: string) =>
      context.canvasElement.ownerDocument.querySelector(`td[data-day="${date}"] button`)
    await expect(day("2027-07-31")).toBeDisabled()
    await expect(day("2027-08-01")).toBeEnabled()
    // Closed again, so the story ends on the page and not on the calendar.
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("grid")).not.toBeInTheDocument())
    await waitFor(() =>
      expect(
        context.canvasElement.ownerDocument.querySelector("[data-slot=popover-content]"),
      ).toBeNull(),
    )
  },
}

/** Events are published, but none matches: a zero result that clears everything. */
export const NoMatch: Story = {
  args: { url: "/events?q=lyzovani&open=true" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogList())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const noMatch = await canvas.findByText("Hledání a filtrům neodpovídá žádná akce")
    await expect(canvas.getByRole("button", { name: "Filtry (1)" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    await expect(canvas.queryByText("Zatím žádné veřejné akce")).not.toBeInTheDocument()
    const emptyState = within(noMatch.closest("[data-slot=empty]") ?? canvasElement)
    await userEvent.click(emptyState.getByRole("button", { name: "Zrušit filtry" }))
    await expect(
      await canvas.findByRole("link", { name: "Letní tábor Modrá Hora 2027" }),
    ).toBeInTheDocument()
    for (const name of ["Příměstský tábor Město hrou", "Podzimní víkend pro mladé organizátory"]) {
      await expect(canvas.getByRole("link", { name })).toBeInTheDocument()
    }
    await expect(canvas.getByRole("searchbox", { name: "Hledat akci" })).toHaveValue("")
    await expect(canvas.getByRole("button", { name: "Filtry (0)" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Filtry (0)" }))
    await expect(
      canvas.getByRole("switch", { name: "Pouze akce s otevřeným přihlašováním" }),
    ).not.toBeChecked()
  },
}

/** A retry after a failed load keeps the filters; the search starts empty. */
export const RetryKeepsFilters: Story = {
  args: { url: "/events?place=hlinsko" },
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListFailedOnce())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Katalog se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Zkusit znovu" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Filtry (1)" }))
    await expect(
      await canvas.findByRole("textbox", { name: "Místo" }, { timeout: 5000 }),
    ).toHaveValue("hlinsko")
    await expect(
      canvas.getByRole("link", { name: "Letní tábor Modrá Hora 2027" }),
    ).toBeInTheDocument()
    await expect(
      canvas.queryByRole("link", { name: "Podzimní víkend pro mladé organizátory" }),
    ).not.toBeInTheDocument()
  },
}

/** No event is published. */
export const NoPublishedEvents: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListEmpty())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Zatím žádné veřejné akce")).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: "Zpět na úvodní stránku" })).toBeInTheDocument()
  },
}

/** Loading failed: an error with retry, not an empty catalog. */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...publicEventHandlers.catalogListFailed())
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Katalog se nepodařilo načíst")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
    await expect(canvas.queryByText("Zatím žádné veřejné akce")).not.toBeInTheDocument()
  },
}
