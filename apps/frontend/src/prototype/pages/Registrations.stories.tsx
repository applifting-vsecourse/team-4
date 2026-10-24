import type { Meta, StoryObj } from "@storybook/react-vite"
import { delay, http, HttpResponse } from "msw"
import { expect, within } from "storybook/test"

import { MOCK_API } from "@/prototype/mockBackend/handlers"
import { DEMO } from "@/prototype/mockBackend/scenarios"
import {
  DARK,
  DESKTOP,
  expectToast,
  fill,
  knownIssues,
  MOBILE,
  prototypeMeta,
  screenOf,
  urls,
  waitForOverlaysToClose,
} from "@/prototype/prototypeStories"

// Správa akce → Přihlášky (S2-11) and recording a received payment in the
// detail (S2-12). Letní tábor has a registration in every payment state.
const meta = {
  ...prototypeMeta,
  title: "Pages/Organizer/Registrations",
  args: {
    ...prototypeMeta.args,
    organizer: "jana",
    route: urls.event(DEMO.summerCamp, "/registrations"),
  },
  globals: DESKTOP,
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const rows = (canvasElement: HTMLElement) =>
  within(canvasElement).queryAllByRole("link", { name: /^Otevřít přihlášku/ })

export const List: Story = {
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole("link", { name: "Otevřít přihlášku Anna Nováková" })
    await expect(rows(canvasElement)).toHaveLength(8)
  },
}

export const ListMobile: Story = { globals: MOBILE }

export const ListDark: Story = { globals: { ...DESKTOP, ...DARK } }

/** The filters live in the URL, so a link or a refresh keeps them. */
export const FilteredByUrl: Story = {
  args: { route: `${urls.event(DEMO.summerCamp, "/registrations")}?payment=unpaid` },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole("link", { name: "Otevřít přihlášku Anna Nováková" })
    await expect(rows(canvasElement)).toHaveLength(3)
  },
}

/** Term and status match on the same term: who waits for 2. turnus. */
export const FilterWaitlisted: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const page = screenOf(canvasElement)
    await userEvent.click(await canvas.findByRole("combobox", { name: "Termín" }))
    await userEvent.click(await page.findByRole("option", { name: "2. turnus" }))
    await waitForOverlaysToClose(canvasElement)
    await userEvent.click(canvas.getByRole("combobox", { name: "Stav účasti" }))
    await userEvent.click(await page.findByRole("option", { name: "Náhradník" }))
    await expect(
      await canvas.findByRole("link", { name: "Otevřít přihlášku Klára Procházková" }),
    ).toBeVisible()
    await expect(rows(canvasElement)).toHaveLength(2)
    await waitForOverlaysToClose(canvasElement)
  },
}

/** Some registrations, none matching: not the same as "none yet". */
export const NoMatch: Story = {
  args: {
    route: `${urls.event(DEMO.summerCamp, "/registrations")}?payment=overpaid&status=waitlisted`,
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Zrušit filtry" }))
    await expect(
      await canvas.findByRole("link", { name: "Otevřít přihlášku Anna Nováková" }),
    ).toBeVisible()
  },
}

export const Empty: Story = {
  args: { route: urls.event(DEMO.hike, "/registrations") },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Tato akce zatím nemá žádné přihlášky.")).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(MOCK_API.registrations, async () => {
        await delay("infinite")
        return HttpResponse.json({})
      }),
    )
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání přihlášek" })).toBeVisible()
  },
}

export const LoadError: Story = {
  parameters: knownIssues("destructiveAlertContrast"),
  beforeEach: ({ msw }) => {
    msw.use(http.get(MOCK_API.registrations, () => HttpResponse.json({}, { status: 500 })))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Data se nepodařilo načíst. Zkuste to znovu."),
    ).toBeVisible()
  },
}

export const Detail: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.annaSummer) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Anna Nováková" })).toBeVisible()
    await expect(canvas.getByText("Nezaplaceno")).toBeVisible()
  },
}

export const DetailMobile: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.annaSummer) },
  globals: MOBILE,
}

export const DetailDark: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.annaSummer) },
  globals: { ...DESKTOP, ...DARK },
}

export const DetailPartiallyPaid: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.jakub) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Částečně zaplaceno")).toBeVisible()
  },
}

export const DetailOverpaid: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.tomas) },
  play: async ({ canvas }) => {
    // The badge and the balance row both say it.
    await expect(await canvas.findAllByText("Přeplatek")).toHaveLength(2)
  },
}

/** Only waitlisted terms: no payment obligation, no variable symbol to pay to. */
export const DetailWaitlisted: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.klara) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Bez platební povinnosti")).toBeVisible()
  },
}

/** Confirmed in 1. turnus, waiting for 2. turnus: both outcomes in one registration. */
export const DetailConfirmedAndWaitlisted: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.filip) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Filip Novotný" })).toBeVisible()
  },
}

/** Two payments take the registration from unpaid through partial to paid. */
export const RecordPayments: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.annaSummer) },
  parameters: knownIssues("successToastContrast"),
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    const page = screenOf(canvasElement)
    const pay = async (amount: string) => {
      await userEvent.click(await canvas.findByRole("button", { name: "Zaznamenat platbu" }))
      const dialog = await page.findByRole("dialog", { name: "Zaznamenat platbu" })
      await fill(userEvent, dialog, { "Přijatá částka (Kč)": amount })
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit platbu" }))
      await waitForOverlaysToClose(canvasElement)
    }
    await step("record 2 000 Kč", async () => {
      await pay("2000")
      await expect(await canvas.findByText("Částečně zaplaceno")).toBeVisible()
    })
    await step("record the remaining 2 500 Kč", async () => {
      await pay("2500")
      await expect(await canvas.findByText("Zaplaceno")).toBeVisible()
      await expectToast(canvasElement, "Platba 2 500 Kč zaznamenána")
    })
  },
}

export const PaymentValidation: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.annaSummer) },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Zaznamenat platbu" }))
    const dialog = await screenOf(canvasElement).findByRole("dialog", { name: "Zaznamenat platbu" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit platbu" }))
    await expect(
      await within(dialog).findByRole("textbox", { name: "Přijatá částka (Kč)" }),
    ).toHaveAttribute("aria-invalid", "true")
  },
}

/** A registration of another event or organization looks like a missing one (S2-03). */
export const DetailNotFound: Story = {
  args: { route: urls.registration(DEMO.summerCamp, DEMO.registrations.annaRobotics) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Záznam není dostupný")).toBeVisible()
  },
}
