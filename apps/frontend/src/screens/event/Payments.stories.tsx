import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { failOn, failsOnRefresh, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { refresh, showsText } from "@/screens/steps"

import { paymentHandlers } from "@/features/payments/fixtures/handlers"
import { EMPTY_STATEMENT } from "@/features/payments/fixtures/payments"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import {
  makeEventPayments,
  makeEventWithoutPayments,
} from "@/features/registrations/fixtures/registrations"

const TRANSACTIONS = "/organizations/:organizationId/events/:eventId/bank-transactions"
const OVERVIEW = "/organizations/:organizationId/events/:eventId/payments"

const meta = {
  title: "Screens/Event/Payments",
  ...screenMeta,
  args: { url: eventUrl("/payments") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

type Canvas = StoryContext["canvas"]

const statement = new File(['"ID operace";"Datum";"Objem";"Měna"'], "vypis.csv", {
  type: "text/csv",
})

/** Picks a statement through „Import výpisu“. */
const importStatement = async (canvas: Canvas) => {
  await canvas.findByRole("button", { name: "Import výpisu" }, { timeout: 5000 })
  await userEvent.upload(canvas.getByLabelText("Soubor s výpisem"), statement)
}

/** From the selected event's management, Platby opens the import of that event. */
export const OpenFromEvent: Story = {
  args: { url: eventUrl() },
  play: async ({ canvas }) => {
    const navigation = await canvas.findByRole(
      "navigation",
      { name: "Navigace organizace a akce" },
      { timeout: 5000 },
    )
    await userEvent.click(within(navigation).getByRole("link", { name: "Platby" }))
    await showsHeading("Přijaté transakce")({ canvas })
    await expect(canvas.getByRole("button", { name: "Import výpisu" })).toBeEnabled()
    await expect(within(navigation).getByRole("link", { name: "Platby" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  },
}

/** Balances of registrations with an obligation and received payments, newest first (S4-09). */
export const PaymentsAndBalances: Story = {
  play: async ({ canvas }) => {
    await showsHeading("Přijaté platby a salda")({ canvas })
    const balances = await canvas.findByRole(
      "region",
      { name: "Tabulka sald přihlášek" },
      { timeout: 5000 },
    )
    const jakub = within(balances).getByRole("row", { name: /Jakub Dvořák/ })
    await expect(within(jakub).getByText("Částečně zaplaceno")).toBeVisible()
    // Celkem, Zaplaceno and Zbývá zaplatit, as the registration list counts them.
    for (const amount of ["4 500 Kč", "2 000 Kč", "2 500 Kč"]) {
      await expect(within(jakub).getByText(amount)).toBeVisible()
    }
    // Without an obligation there is no balance to watch.
    await expect(within(balances).queryByText(/Klára Procházková/)).not.toBeInTheDocument()

    const payments = canvas.getByRole("region", { name: "Tabulka přijatých plateb" })
    await expect(within(payments).getAllByRole("row")).toHaveLength(5)
    await expect(within(payments).getByText("QR platba")).toBeVisible()
    // A payment opens the detail of its registration.
    const [latest] = makeEventPayments().payments
    if (!latest) throw new Error("The overview fixture has no payment")
    const { registration } = latest
    await expect(
      within(payments).getByRole("link", {
        name: `Přihláška ${registration.firstName} ${registration.lastName}`,
      }),
    ).toHaveAttribute("href", expect.stringContaining(`/registrations/${registration.id}`))
  },
}

/** Nothing received yet: the balances are shown and the import is one click away. */
export const NoPayments: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.eventPayments(makeEventWithoutPayments()))
  },
  play: async ({ canvas }) => {
    await showsText("Zatím žádné přijaté platby")
    await expect(canvas.getByRole("region", { name: "Tabulka sald přihlášek" })).toBeVisible()
    await expect(canvas.getByRole("link", { name: "Přejít na import výpisu" })).toHaveAttribute(
      "href",
      expect.stringContaining("#statement-import-heading"),
    )
  },
}

export const OverviewLoading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", OVERVIEW))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání plateb" }, { timeout: 5000 }),
    ).toBeVisible()
  },
}

/** A failed first load is not shown as empty and offers a retry. */
export const OverviewLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", OVERVIEW))
  },
  play: async ({ canvas }) => {
    await showsText("Platby se nepodařilo načíst")
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeVisible()
    await expect(canvas.queryByText("Zatím žádné přijaté platby")).not.toBeInTheDocument()
  },
}

/** A failed refresh keeps the last overview and says so. */
export const OverviewRefreshFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failsOnRefresh("get", OVERVIEW, makeEventPayments()))
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("region", { name: "Tabulka přijatých plateb" }, { timeout: 5000 })
    await refresh(canvas)
    await showsText("Aktualizace se nezdařila")
    await expect(canvas.getByRole("region", { name: "Tabulka přijatých plateb" })).toBeVisible()
  },
}

/** Received transactions of the event, newest first (F23). */
export const Transactions: Story = {
  play: async ({ canvas }) => {
    await showsHeading("Přijaté transakce")({ canvas })
    const table = await canvas.findByRole("region", { name: "Tabulka přijatých transakcí" })
    await expect(within(table).getByText("Petra Svobodová")).toBeVisible()
    await expect(within(table).getByText("1003")).toBeVisible()
  },
}

/** No statement imported yet: the import starts from the empty section. */
export const NoTransactions: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...paymentHandlers.transactions([]))
  },
  play: async ({ canvas }) => {
    await showsText("Zatím žádné přijaté transakce")
    await expect(canvas.getByRole("button", { name: "Import výpisu" })).toBeEnabled()
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", TRANSACTIONS))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání transakcí" }, { timeout: 5000 }),
    ).toBeVisible()
  },
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", TRANSACTIONS))
  },
  play: async ({ canvas }) => {
    await showsText("Transakce se nepodařilo načíst")
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeVisible()
  },
}

export const Importing: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", `${TRANSACTIONS}/import`))
  },
  play: async ({ canvas }) => {
    await importStatement(canvas)
    await expect(await canvas.findByRole("button", { name: "Importuji…" })).toBeDisabled()
  },
}

/** New transactions, one known from before and one outgoing payment skipped. */
export const Imported: Story = {
  play: async ({ canvas }) => {
    await importStatement(canvas)
    await showsText("Výpis byl naimportován")
    await expect(canvas.getByText("Již dříve naimportované")).toBeVisible()
    await expect(canvas.getByText("Přeskočené odchozí platby")).toBeVisible()
  },
}

/** An empty statement: zero new transactions. */
export const EmptyStatement: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...paymentHandlers.import(EMPTY_STATEMENT))
  },
  play: async ({ canvas }) => {
    await importStatement(canvas)
    await showsText("Výpis neobsahuje žádné přijaté platby")
    await expect(canvas.getByText("Nové transakce")).toBeVisible()
  },
}

/** A file that is not a statement; nothing is imported. */
export const UnsupportedFile: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("post", `${TRANSACTIONS}/import`, 400, {
        code: "statement_format",
        message: "Soubor není podporovaný výpis. Nahrajte výpis pohybů na účtu ve formátu CSV.",
      }),
    )
  },
  play: async ({ canvas }) => {
    await importStatement(canvas)
    await showsText("Výpis nebyl naimportován")
    await showsText(/Soubor není podporovaný výpis/)
  },
}

/** An invalid movement: the whole statement is refused, naming the line. */
export const InvalidStatement: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("post", `${TRANSACTIONS}/import`, 400, {
        code: "statement_invalid",
        message:
          "Řádek 12 výpisu obsahuje neplatnou částku. Výpis nebyl uložen; zkontrolujte soubor a nahrajte ho znovu.",
      }),
    )
  },
  play: async ({ canvas }) => {
    await importStatement(canvas)
    await showsText(/Řádek 12 výpisu obsahuje neplatnou částku/)
  },
}
