import { expect, test } from "@playwright/test"

import { newParticipant, register, setUpEvent, type TermSpec } from "./support/api"
import { closeDb, createMagicLink, decideTerms } from "./support/db"

// Detail přihlášky → Spravovat přihlášku → Ubytování (S4-05): a confirmed
// participant picks other confirmed participants of the event, saved at once;
// the organizer sees the wishes in the registration detail. A participant
// who is not confirmed sees no participant names and is no candidate.

const terms: TermSpec[] = [
  { label: "1. turnus", startDate: "2027-07-01", endDate: "2027-07-07", priceMinor: 100000 },
]

test.afterAll(closeDb)

test("a confirmed participant picks roommates, and the organizer sees them", async ({
  browser,
  page,
}) => {
  const event = await setUpEvent(page.request, { terms })
  const people = {
    jana: newParticipant("Jana"),
    eva: newParticipant("Eva"),
    petra: newParticipant("Petra"),
    olga: newParticipant("Olga"),
  }
  const ids: Record<string, string> = {}
  for (const [key, person] of Object.entries(people)) {
    ids[key] = (await register(page.request, event.publicId, person, event.termIds)).id
  }
  await decideTerms(ids.jana!, "confirmed")
  await decideTerms(ids.eva!, "confirmed")
  await decideTerms(ids.petra!, "confirmed")
  await decideTerms(ids.olga!, "waitlisted")

  const participant = await browser.newContext()
  const portal = await participant.newPage()
  const signIn = async (email: string) => {
    await portal.goto(`/my-registrations/verify?token=${await createMagicLink(email)}`)
    await expect(portal.getByRole("heading", { name: "Moje přihlášky", level: 1 })).toBeVisible()
  }

  // Olga is not confirmed: the detail explains when she can choose, with no names.
  await signIn(people.olga.email)
  await portal.goto(`/my-registrations/${ids.olga}`)
  await expect(portal.getByText("Spolubydlící si můžete vybrat po potvrzení účasti.")).toBeVisible()
  await expect(
    portal.getByRole("button", { name: /Vybrat spolubydlící|Upravit výběr/ }),
  ).toHaveCount(0)

  await signIn(people.jana.email)
  await portal.goto(`/my-registrations/${ids.jana}`)
  await expect(portal.getByText("Zatím jste nikoho nevybrali")).toBeVisible()
  await portal.getByRole("link", { name: "Spravovat přihlášku" }).click()
  const picker = portal.getByRole("dialog", { name: "Výběr spolubydlících" })
  await expect(portal.getByRole("heading", { name: "Správa přihlášky" })).toBeVisible()
  await portal.getByRole("button", { name: "Vybrat spolubydlící" }).click()
  // Only the other confirmed participants: never Jana herself or Olga.
  await expect(picker.getByRole("option")).toHaveCount(2)
  await expect(picker.getByRole("option", { name: "Olga Nováková" })).toHaveCount(0)
  await picker.getByPlaceholder("Hledat účastníka…").fill("Eva")
  await picker.getByRole("option", { name: "Eva Nováková" }).click()
  await expect(picker).toBeVisible()
  await expect(picker.getByRole("list", { name: "Vybraní spolubydlící" })).toContainText(
    "Eva Nováková",
  )
  await picker.getByRole("button", { name: "Uložit výběr" }).click()
  await expect(portal.getByText("Přání na spolubydlící je uložené")).toBeVisible()
  await portal.getByRole("link", { name: "Detail přihlášky" }).click()
  await expect(
    portal.getByRole("list", { name: "Vybraní spolubydlící" }).getByText("Eva Nováková"),
  ).toBeVisible()
  await expect(portal.getByRole("button", { name: "Upravit výběr" })).toHaveCount(0)

  // Saved: a reload shows the choice.
  await portal.reload()
  await expect(
    portal.getByRole("list", { name: "Vybraní spolubydlící" }).getByText("Eva Nováková"),
  ).toBeVisible()
  await expect(portal.getByRole("button", { name: "Upravit výběr" })).toHaveCount(0)
  await portal.getByRole("link", { name: "Spravovat přihlášku" }).click()
  await expect(portal.getByRole("button", { name: "Upravit výběr" })).toBeVisible()
  await participant.close()

  // The organizer sees it at once, without approving anything.
  await page.goto(
    `/organizations/${event.organizationId}/events/${event.eventId}/registrations/${ids.jana}`,
  )
  await expect(page.getByText("Přání na spolubydlící")).toBeVisible()
  await expect(page.getByText("Eva Nováková")).toBeVisible()
})
