import type { Meta } from "@storybook/react-vite"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { expect, waitFor, within, type userEvent } from "storybook/test"

import { ROUTES } from "@/app/routes"
import { waitForPage } from "@/prototype/activeSession"
import { mockBackendHandlers } from "@/prototype/mockBackend/handlers"
import { ORGANIZERS, PARTICIPANTS, SCENARIOS } from "@/prototype/mockBackend/scenarios"
import { PrototypeApp } from "@/prototype/PrototypeApp"

/**
 * Meta shared by every story that runs the whole app on the mock backend.
 * Spread it and set `title` and the `route` arg; `organizer`/`participant`
 * pick who is signed in.
 */
export const prototypeMeta = {
  component: PrototypeApp,
  parameters: {
    // The app's own router replaces the global one-route decorator.
    appRouter: true,
    layout: "fullscreen",
    msw: mockBackendHandlers,
  },
  args: {
    route: ROUTES.home,
    scenario: "demo",
    organizer: "nobody",
    participant: "nobody",
    latency: 0,
    isServerDown: false,
    hasToolbar: false,
  },
  argTypes: {
    route: { control: "text" },
    scenario: { control: "inline-radio", options: Object.keys(SCENARIOS) },
    organizer: { control: "inline-radio", options: Object.keys(ORGANIZERS) },
    participant: { control: "inline-radio", options: Object.keys(PARTICIPANTS) },
    latency: { control: { type: "range", min: 0, max: 3000, step: 100 } },
  },
  // A story without its own play still waits for the page, so the a11y check
  // after it sees the loaded page rather than the route's spinner.
  play: () => waitForPage(),
} satisfies Meta<typeof PrototypeApp>

/**
 * A11y findings awaiting a design decision, with the axe rule each one trips.
 * Fixing them is a theme-token or ui-kit change (AGENTS.md: ask first), so a
 * story that shows one turns off only that rule; every other rule still runs.
 * Remove an entry once its issue is fixed.
 */
const KNOWN_ISSUES = {
  /** The destructive token on the destructive Alert measures 4.16–4.3:1, below WCAG AA 4.5:1. */
  destructiveAlertContrast: "color-contrast",
  /**
   * The avatar initials in the header's account menu: `muted-foreground` on
   * `muted` measures 4.39:1 (DESIGN.md, contrast rules). SidebarAccount works
   * around it with a className; HeaderMenu does not.
   */
  headerAvatarContrast: "color-contrast",
  /** sonner's `richColors` success toast (#008a2e on #ecfdf3) measures 4.25:1; not our tokens. */
  successToastContrast: "color-contrast",
  /**
   * The kit Table's scroll container is not focusable, so a table without
   * links or buttons that overflows on a phone cannot be scrolled by keyboard.
   */
  tableScrollKeyboard: "scrollable-region-focusable",
} as const

export const knownIssues = (...issues: (keyof typeof KNOWN_ISSUES)[]) => ({
  a11y: {
    config: {
      rules: [...new Set(issues.map((issue) => KNOWN_ISSUES[issue]))].map((id) => ({
        id,
        enabled: false,
      })),
    },
  },
})

export const DESKTOP = { viewport: { value: "desktop" } }
export const MOBILE = { viewport: { value: "mobile360" } }
export const DARK = { theme: "dark" }

type EventRef = { id: string; organizationId: string }

/** URLs of the app for the ids in `DEMO`. */
export const urls = {
  organization: (organizationId: string) => `/organizations/${organizationId}`,
  newEvent: (organizationId: string) => `/organizations/${organizationId}/events/new`,
  event: (
    event: EventRef,
    section: "" | "/settings" | "/edit" | "/rooms" | "/registrations" = "",
  ) => `/organizations/${event.organizationId}/events/${event.id}${section}`,
  registration: (event: EventRef, registrationId: string) =>
    `${urls.event(event, "/registrations")}/${registrationId}`,
  publicEvent: (event: { publicId: string }) => `/e/${event.publicId}`,
  myRegistration: (registrationId: string) => `/my-registrations/${registrationId}`,
}

type User = ReturnType<typeof userEvent.setup>

/** Portalled content (dialogs, menus, popovers, toasts) is outside the canvas. */
export const screenOf = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body)

/** Types into the labelled fields inside `root`, replacing what they hold; waits for the form. */
export async function fill(user: User, root: HTMLElement, values: Record<string, string>) {
  const fields = within(root)
  for (const [label, value] of Object.entries(values)) {
    const field = await fields.findByLabelText(label, { exact: true })
    await user.clear(field)
    if (value) await user.type(field, value)
  }
}

/**
 * Picks `yyyy-MM-dd` in a DatePicker the way a person does: open it, step
 * through the months, click the day.
 */
export async function pickDate(user: User, root: HTMLElement, label: string, date: string) {
  await user.click(within(root).getByRole("button", { name: new RegExp(`^${label}`) }))
  // Only this picker's calendar: the previous one may still be animating out.
  const popover = await waitFor(() => {
    const open = root.ownerDocument.querySelector<HTMLElement>(
      '[data-slot="popover-content"][data-state="open"]',
    )
    if (!open) throw new Error("The calendar did not open.")
    return open
  })
  const calendar = within(popover)
  const [year, month, day] = date.split("-").map(Number) as [number, number, number]
  const dayName = new RegExp(format(new Date(year, month - 1, day), "PPPP", { locale: cs }))
  for (let step = 0; step < 24 && !calendar.queryByRole("button", { name: dayName }); step++) {
    await user.click(calendar.getByRole("button", { name: "Přejít na další měsíc" }))
  }
  await user.click(calendar.getByRole("button", { name: dayName }))
  await waitFor(() => {
    if (popover.isConnected) throw new Error("The calendar is still open.")
  })
}

/**
 * A month the DatePicker can show from today. It stops at the end of the
 * current year (react-day-picker's default with year dropdowns), so in
 * December this stays in the current month.
 */
export function pickableDates() {
  const today = new Date()
  const month = today.getMonth() === 11 ? 11 : today.getMonth() + 1
  const day = (n: number) => format(new Date(today.getFullYear(), month, n), "yyyy-MM-dd")
  return { start: day(10), end: day(16) }
}

/**
 * Waits until dialogs, menus and select lists are gone. While one closes, Radix keeps the
 * rest of the page aria-hidden, so queries and the a11y check would miss it.
 */
export const waitForOverlaysToClose = (canvasElement: HTMLElement) =>
  waitFor(
    () => {
      const overlay = canvasElement.ownerDocument.querySelector(
        '[role="dialog"], [role="menu"], [role="listbox"], [data-aria-hidden]',
      )
      if (overlay) throw new Error("A dialog or menu is still open or closing.")
    },
    { timeout: 3000 },
  )

const dockOf = (canvasElement: HTMLElement) =>
  within(within(canvasElement).getByRole("complementary", { name: "Prototype controls" }))

/** Steps through the prototype controls (`hasToolbar: true`), as a tester would. */
export const dock = {
  jumpTo: async (user: User, canvasElement: HTMLElement, item: string | RegExp) => {
    await user.click(dockOf(canvasElement).getByRole("button", { name: "Jump to" }))
    await user.click(await screenOf(canvasElement).findByRole("menuitem", { name: item }))
    await waitForOverlaysToClose(canvasElement)
  },
  back: (user: User, canvasElement: HTMLElement) =>
    user.click(dockOf(canvasElement).getByRole("button", { name: "Back" })),
  visit: async (user: User, canvasElement: HTMLElement, path: string) => {
    const address = dockOf(canvasElement).getByRole("textbox", { name: "Address" })
    await user.clear(address)
    await user.type(address, `${path}{Enter}`)
  },
  /** Follows the link in the newest e-mail of the mailbox. */
  openLatestEmail: async (user: User, canvasElement: HTMLElement) => {
    const mailbox = dockOf(canvasElement).getByRole("region", { name: "Mailbox" })
    const [newest] = await within(mailbox).findAllByRole("button", {
      name: "Zobrazit moje přihlášky",
    })
    await user.click(newest!)
  },
}

/** The success toast of an action, outside the canvas; it may still be fading in. */
export const expectToast = async (canvasElement: HTMLElement, text: string) =>
  expect(await screenOf(canvasElement).findByText(text)).toBeInTheDocument()
