import type { Meta, StoryObj } from "@storybook/react-vite"
import { delay, http, HttpResponse } from "msw"
import { expect, screen, userEvent, within } from "storybook/test"

import { apiUrl, failOn, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, openRowMenu, showsText } from "@/screens/steps"

import {
  makeTermEvaluation,
  makeUnevaluatedTerm,
} from "@/features/accommodation/fixtures/evaluation"
import { accommodationHandlers } from "@/features/accommodation/fixtures/handlers"
import { OPEN_EVENT } from "@/features/events/fixtures/events"
import { eventHandlers } from "@/features/events/fixtures/handlers"

const meta = {
  title: "Screens/Event/Registrations/Evaluation",
  ...screenMeta,
  args: { url: eventUrl("/registrations?view=evaluation") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

function textLeft(element: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(element)
  return range.getBoundingClientRect().left
}

/** Přihlášky → Vyhodnocení: the current proposal of Turnus 1 with its queues and order (S3-01). */
export const Evaluation: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Pořadí")(context)
    const { canvas } = context
    const row = within(canvas.getByRole("row", { name: /Anna Procházková/ }))
    const status = within(row.getByRole("cell", { name: /^Náhradník$/ })).getByText("Náhradník")
    const proposal = within(row.getByRole("cell", { name: /^Vhodný$/ })).getByText("Vhodný")
    await expect(
      Math.abs(textLeft(status) - textLeft(canvas.getByRole("columnheader", { name: "Stav" }))),
    ).toBeLessThanOrEqual(1)
    await expect(
      Math.abs(textLeft(proposal) - textLeft(canvas.getByRole("columnheader", { name: "Návrh" }))),
    ).toBeLessThanOrEqual(1)

    const rank = canvas.getByRole("columnheader", { name: "Pořadí" })
    const inset = textLeft(rank) - rank.getBoundingClientRect().left
    await expect(inset).toBeCloseTo(parseFloat(getComputedStyle(rank).paddingLeft))
  },
}

type Story = StoryObj<typeof meta>

const BASE = "/organizations/:organizationId/events/:eventId/accommodation"
const TERM = `${BASE}/terms/:termId`
/** The term's evaluation, changed for one story. */
const evaluation = (
  overrides: Parameters<typeof makeTermEvaluation>[0],
): Pick<Story, "beforeEach"> => ({
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.termEvaluation(makeTermEvaluation(overrides)))
  },
})

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", `${TERM}/evaluation`))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání vyhodnocení termínu" }),
    ).toBeVisible()
    // The term tabs stay, so another term can be picked (S4-01).
    await expect(canvas.getByRole("tab", { name: "Turnus 2" })).toBeVisible()
  },
}

/**
 * Another term is loading: its tabs stay and the placeholder keeps the page
 * height, so the organizer stays where they were (S4-01).
 */
export const SwitchingTerm: Story = {
  beforeEach: ({ msw }) => {
    const [, second] = OPEN_EVENT.terms
    msw.use(
      // Only the second term never answers; the first falls through to the backend.
      http.get(apiUrl(`${TERM}/evaluation`), async ({ params }) => {
        if (params.termId !== second?.id) return undefined
        await delay("infinite")
      }),
    )
  },
  play: async (context) => {
    await showsHeading("Pořadí")(context)
    const { canvas } = context
    await userEvent.click(canvas.getByRole("tab", { name: "Turnus 2" }))
    await expect(
      await canvas.findByRole("status", { name: "Načítání vyhodnocení termínu" }),
    ).toBeVisible()
    await expect(canvas.getByRole("tab", { name: "Turnus 2" })).toHaveAttribute(
      "data-state",
      "active",
    )
  },
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", `${TERM}/evaluation`))
  },
  play: () => showsText("Vyhodnocení termínu se nepodařilo načíst"),
}

/** One queue of the hard attribute, from the URL. */
export const QueueDetail: Story = {
  args: { url: eventUrl("/registrations?view=evaluation&queue=female") },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { name: /^Žena/ })).toHaveAttribute(
      "data-state",
      "active",
    )
  },
}

export const NeverEvaluated: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.termEvaluation(makeUnevaluatedTerm()))
  },
  play: () => showsText("Termín zatím nebyl vyhodnocen"),
}

export const Recalculating: Story = {
  ...evaluation({ status: "running" }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Přepočítává se…" })).toBeDisabled()
  },
}

/** The inputs changed since the run: no bulk confirmation until recalculated. */
export const StaleProposal: Story = {
  ...evaluation({ status: "stale" }),
  play: () => showsText("Podklady se od výpočtu změnily"),
}

export const RunFailed: Story = {
  ...evaluation({ status: "failed" }),
  play: () => showsText("Výpočet se nezdařil"),
}

export const RunTimedOut: Story = {
  ...evaluation({ status: "timeout" }),
  play: () => showsText("Výpočet nedoběhl v časovém limitu"),
}

/** Confirmed participants no longer fit the rooms. */
export const Conflict: Story = {
  ...evaluation({
    status: "infeasible",
    conflict: {
      constraint: "capacity",
      confirmed: [
        {
          registrationId: "0190c0de-0000-7000-8000-000000000601",
          firstName: "Tereza",
          lastName: "Nováková",
        },
      ],
    },
  }),
  play: () => showsText("Potvrzení účastníci se nevejdou do dostupných pokojů"),
}

export const RecalculateFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${TERM}/evaluation`, 404, { message: "Záznam není dostupný" }))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Přepočítat" }))
    await showsText("Přepočet se nepodařilo spustit")
  },
}

export const HistoryLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", `${TERM}/order/moves`))
  },
  play: () => showsText("Historii se nepodařilo načíst"),
}

export const RunEvidence: Story = {
  play: async () => {
    const [evidence] = await screen.findAllByRole("button", { name: "Doklad" }, { timeout: 5000 })
    await userEvent.click(evidence!)
    await showsText("Chatka Sova")
  },
}

export const BulkConfirmReview: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(
      canvas,
      "Potvrdit všechny vhodné (3)",
      "Potvrdit všechny vhodné",
    )
    await expect(within(dialog).getByRole("button", { name: "Potvrdit 3 účasti" })).toBeVisible()
  },
}

export const BulkConfirmFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${TERM}/confirmations`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(
      canvas,
      "Potvrdit všechny vhodné (3)",
      "Potvrdit všechny vhodné",
    )
    await userEvent.click(within(dialog).getByRole("button", { name: "Potvrdit 3 účasti" }))
    await showsText("Potvrzení se nepodařilo uložit")
  },
}

export const BulkConfirmStale: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("post", `${TERM}/confirmations`, 409, {
        code: "proposal_stale",
        message: "Podklady se změnily. Nikdo nebyl potvrzen, načtěte aktuální návrh.",
      }),
    )
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(
      canvas,
      "Potvrdit všechny vhodné (3)",
      "Potvrdit všechny vhodné",
    )
    await userEvent.click(within(dialog).getByRole("button", { name: "Potvrdit 3 účasti" }))
    await showsText("Návrh je neaktuální, nikdo nebyl potvrzen")
  },
}

/** A capacity check refused one decision. */
export const DecisionRejected: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("post", `${TERM}/registrations/:registrationId/decision`, 409, {
        code: "no_capacity",
        message: "V termínu není dost volné kapacity, účast nebyla potvrzena.",
      }),
    )
  },
  play: async ({ canvas }) => {
    const menu = await openRowMenu(canvas, "Lucie Sedláčková")
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Potvrdit účast" }))
    const dialog = await screen.findByRole("dialog", { name: "Potvrdit účast" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Potvrdit účast" }))
    await showsText("Účast nebyla potvrzena")
  },
}

/** "Určit ubytování" sends nothing without a value and a reason. */
export const DetermineInvalid: Story = {
  play: async ({ canvas }) => {
    const menu = await openRowMenu(canvas, "Alex Šimek")
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Určit ubytování" }))
    const dialog = await screen.findByRole("dialog", { name: "Určit ubytování" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit určení" }))
    await showsText("Vyberte hodnotu.")
    await showsText("Uveďte důvod.")
  },
}

export const MoveInvalid: Story = {
  play: async ({ canvas }) => {
    const menu = await openRowMenu(canvas, "Tereza Nováková")
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Změnit pořadí" }))
    const dialog = await screen.findByRole("dialog", { name: "Změnit pořadí: Tereza Nováková" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Pokračovat" }))
    await showsText("Uveďte důvod změny pořadí.")
  },
}

/** Nobody of those waiting fits: nothing to confirm at once. */
export const NoneSuitable: Story = {
  ...evaluation({
    order: makeTermEvaluation().order.map((entry) => ({ ...entry, result: "unsuitable" })),
  }),
  play: () => showsText("Nikdo z čekajících se nyní nevejde"),
}

export const NobodyWaiting: Story = {
  ...evaluation({ order: [], queues: [], manualCount: 0 }),
  play: () => showsText("V termínu nikdo nečeká na rozhodnutí ani na místo"),
}

export const HistoryEmpty: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(apiUrl(`${TERM}/runs`), () => HttpResponse.json({ runs: [] })),
      http.get(apiUrl(`${TERM}/order/moves`), () => HttpResponse.json([])),
    )
  },
  play: () => showsText("Historie zatím neobsahuje záznamy"),
}

export const DecisionFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${TERM}/registrations/:registrationId/decision`))
  },
  play: async ({ canvas }) => {
    const menu = await openRowMenu(canvas, "Lucie Sedláčková")
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Potvrdit účast" }))
    const dialog = await screen.findByRole("dialog", { name: "Potvrdit účast" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Potvrdit účast" }))
    await showsText("Stav účasti ani platby se nezměnily. Zkuste to prosím znovu.")
  },
}

/** The event has no term to evaluate. */
export const NoTerms: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail({ ...OPEN_EVENT, terms: [] }))
  },
  play: () => showsText("Akce zatím nemá žádný termín"),
}
