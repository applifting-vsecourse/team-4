import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { toast } from "sonner"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import {
  NOTIFICATIONS,
  READ_NOTIFICATIONS,
} from "@/features/participant-access/fixtures/notifications"
import { programmeHandlers } from "@/features/programme/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { OWN_REGISTRATION } from "@/features/registrations/fixtures/participantRegistrations"

const LIST_PATH = "/participant/notifications"
const TIMEOUT = { timeout: 5000 }
const MOBILE = { viewport: { value: "mobile", isRotated: false } }
const CAMP = OWN_REGISTRATION.event.name

const meta = {
  title: "Screens/Participant/MyNotifications",
  ...screenMeta,
  args: { url: "/my-notifications" },
  beforeEach: ({ msw }) => {
    msw.use(
      // Before signedIn(), whose empty list the first match would serve.
      ...participantHandlers.notifications(),
      ...participantHandlers.signedIn(),
      ...registrationHandlers.own(),
      ...programmeHandlers.participant(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

type Context = Pick<StoryContext, "canvasElement">

const main = ({ canvasElement }: Context) => within(canvasElement.querySelector("main")!)

/** The titles of the listed notifications, top to bottom, once the list has loaded. */
const titles = async (context: Context) => {
  await showsHeading("Oznámení")({ canvas: within(context.canvasElement) })
  const page = main(context)
  await page.findAllByRole("heading", { level: 2 }, TIMEOUT)
  return page.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)
}

const unreadDots = ({ canvasElement }: Context) =>
  canvasElement.querySelectorAll("main [data-slot='unread-dot']")

const dismissPayment = (context: Context) =>
  userEvent.click(
    main(context).getByRole("button", { name: `Skrýt oznámení Přijatá platba, ${CAMP}` }),
  )

/**
 * Oznámení, newest first: a payment and a decision not opened yet (dot), then
 * an approved request that moved to another term and a rejected one.
 */
export const MyNotifications: Story = {
  play: async (context) => {
    await expect(await titles(context)).toEqual([
      "Nepřečteno: Přijatá platba",
      "Nepřečteno: Rozhodnutí o účasti",
      "Žádost o změnu schválena",
      "Žádost o změnu zamítnuta",
    ])
    await expect(unreadDots(context)).toHaveLength(2)
    const page = main(context)
    await expect(page.getByText(/2\s000\s*Kč/)).toBeVisible()
    await expect(page.getByText("Náhradník")).toBeVisible()
    await expect(page.getByText("Odhlášeno")).toBeVisible()
    await expect(page.getByText("Čeká na rozhodnutí organizátora")).toBeVisible()
    await expect(page.getByText("Potvrzeno")).toBeVisible()
    await expect(page.getAllByText(CAMP)).toHaveLength(2)
  },
}

/** A failed „Označit vše“ keeps the dots and says so. */
export const MarkAllReadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${LIST_PATH}/read`))
  },
  play: async (context) => {
    await titles(context)
    await userEvent.click(context.canvas.getByRole("button", { name: "Označit vše jako přečtené" }))
    await showsText("Oznámení se nepodařilo označit jako přečtená")
    await waitFor(() => expect(unreadDots(context)).toHaveLength(2), TIMEOUT)
    // The toast would outlive the story.
    toast.dismiss()
    await waitFor(
      () =>
        expect(
          screen.queryByText("Oznámení se nepodařilo označit jako přečtená"),
        ).not.toBeInTheDocument(),
      TIMEOUT,
    )
  },
}

/** The payment opens the registration at Přijaté platby and stops being new. */
export const OpenPayment: Story = {
  play: async (context) => {
    await titles(context)
    await userEvent.click(main(context).getByRole("link", { name: "Nepřečteno: Přijatá platba" }))
    await showsHeading(CAMP)(context)
    await expect(context.canvasElement.querySelector("#prijate-platby")).toBeInTheDocument()

    await userEvent.click(context.canvas.getByRole("button", { name: "Účet" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: /Oznámení/ }, TIMEOUT))
    await titles(context)
    await expect(
      await main(context).findByRole("link", { name: "Přijatá platba" }, TIMEOUT),
    ).toBeVisible()
    await expect(unreadDots(context)).toHaveLength(1)
  },
}

/** Every other notification opens the registration itself. */
export const OpenDecision: Story = {
  play: async (context) => {
    await titles(context)
    await expect(
      main(context).getByRole("link", { name: "Nepřečteno: Rozhodnutí o účasti" }),
    ).toHaveAttribute("href", `/my-registrations/${OWN_REGISTRATION.id}`)
    await expect(
      main(context).getByRole("link", { name: "Nepřečteno: Přijatá platba" }),
    ).toHaveAttribute("href", `/my-registrations/${OWN_REGISTRATION.id}#prijate-platby`)
  },
}

/** Everything is marked read at once; the button and every dot disappear. */
export const MarkAllRead: Story = {
  play: async (context) => {
    await titles(context)
    await userEvent.click(context.canvas.getByRole("button", { name: "Označit vše jako přečtené" }))
    await waitFor(() => expect(unreadDots(context)).toHaveLength(0), TIMEOUT)
    await expect(
      context.canvas.queryByRole("button", { name: "Označit vše jako přečtené" }),
    ).not.toBeInTheDocument()
  },
}

/** The cross hides one notification; the others stay. */
export const Dismiss: Story = {
  play: async (context) => {
    await titles(context)
    await dismissPayment(context)
    await waitFor(async () => expect(await titles(context)).toHaveLength(3), TIMEOUT)
    await expect((await titles(context))[0]).toBe("Nepřečteno: Rozhodnutí o účasti")
  },
}

/** A failed dismiss brings the notification back and says so. */
export const DismissFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${LIST_PATH}/:id/dismiss`))
  },
  play: async (context) => {
    await titles(context)
    await dismissPayment(context)
    await showsText("Oznámení se nepodařilo skrýt")
    await waitFor(async () => expect(await titles(context)).toHaveLength(4), TIMEOUT)
    // The toast would outlive the story.
    toast.dismiss()
    await waitFor(
      () => expect(screen.queryByText("Oznámení se nepodařilo skrýt")).not.toBeInTheDocument(),
      TIMEOUT,
    )
  },
}

/** Opened and read: no dot, no button to mark them read. */
export const AllRead: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.notifications(READ_NOTIFICATIONS))
  },
  play: async (context) => {
    await titles(context)
    await expect(await titles(context)).toHaveLength(NOTIFICATIONS.length)
    await expect(unreadDots(context)).toHaveLength(0)
    await expect(
      context.canvas.queryByRole("button", { name: "Označit vše jako přečtené" }),
    ).not.toBeInTheDocument()
  },
}

export const Empty: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.notifications([]))
  },
  play: () => showsText("Zatím nemáte žádná oznámení"),
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", LIST_PATH))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání oznámení" }, TIMEOUT),
    ).toBeVisible()
  },
}

/** The load failed: an error with a retry, never the empty state. */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", LIST_PATH))
  },
  play: async ({ canvas }) => {
    await showsText("Oznámení se nepodařilo načíst")
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeVisible()
    await expect(canvas.queryByText("Zatím nemáte žádná oznámení")).not.toBeInTheDocument()
  },
}

/** The session ended while the page was open: nothing private, a way to a new link. */
export const SessionEnded: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", LIST_PATH, 401))
  },
  play: () => showsText("Přihlášení vypršelo. Pro zobrazení přihlášek si vyžádejte nový odkaz."),
}

/** An unread notification puts a dot on the user icon and on Oznámení in the menu. */
export const AccountMenu: Story = {
  play: async (context) => {
    await titles(context)
    const header = within(context.canvasElement.querySelector("header")!)
    const account = header.getByRole("button", { name: "Účet" })
    await waitFor(() => expect(account).toHaveAccessibleDescription("Máte nepřečtená oznámení"))
    await expect(account.querySelector("[data-slot='unread-dot']")).toBeInTheDocument()
    await userEvent.click(account)
    const menu = await screen.findByRole("menu", {}, TIMEOUT)
    await waitFor(() =>
      expect(within(menu).getByRole("menuitem", { name: "Oznámení (nepřečtená)" })).toBeVisible(),
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(menu).not.toBeInTheDocument(), TIMEOUT)
  },
}

/** At 360 px the notifications fit without horizontal scrolling. */
export const Mobile: Story = {
  globals: MOBILE,
  play: async (context) => {
    await expect(await titles(context)).toHaveLength(NOTIFICATIONS.length)
    await waitFor(() =>
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth),
    )
  },
}
