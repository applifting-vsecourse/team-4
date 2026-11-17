import { expect, test, type Page } from "@playwright/test"

import { newParticipant, register, setUpEvent } from "./support/api"
import { closeDb, decideTerms, variableSymbolOf } from "./support/db"

// Import výpisu (F23) and Párování plateb (F24): from the event overview to
// Platby, a statement in the internet banking's CSV export, pairing by
// variable symbol and by hand, its repetition and a refused file.

test.afterAll(closeDb)

const terms = [
  { label: "Turnus", startDate: "2027-08-01", endDate: "2027-08-07", priceMinor: 100000 },
]
const rooms = [{ label: "Chatka", baseBeds: 1, terms: [0] }]

const HEADER =
  '"ID operace";"Datum";"Objem";"Měna";"Protiúčet";"Název protiúčtu";"Kód banky";"Název banky";"KS";"VS";"SS";"Poznámka";"Zpráva pro příjemce";"Typ"'

const statement = (...movements: string[]) =>
  Buffer.from(
    [
      '"Výpis č. 8/2027 z účtu ""2001234567/2010""";',
      '"Období: 01.08.2027 - 31.08.2027";',
      '"";',
      HEADER,
      ...movements,
    ].join("\r\n"),
  )

const movement = (id: string, date: string, amount: string, vs: string, name: string) =>
  `"${id}";"${date}";"${amount}";"CZK";"123456789";"${name}";"0100";"KB";"";"${vs}";"";"";"Tábor";"Bezhotovostní příjem"`

async function importStatement(page: Page, buffer: Buffer) {
  await page
    .getByLabel("Soubor s výpisem")
    .setInputFiles({ name: "vypis.csv", mimeType: "text/csv", buffer })
}

// One event with one registration for the whole path: every event with
// registrations adds an accommodation evaluation that later specs wait on.
test("the organizer imports a statement once; it pairs by VS, the rest is paired by hand", async ({
  page,
  request,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  const anna = newParticipant("Anna")
  const registration = await register(request, event.publicId, anna, event.termIds)
  await decideTerms(registration.id, "confirmed")
  const symbol = await variableSymbolOf(registration.id)

  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}`)
  await page
    .getByRole("navigation", { name: "Navigace organizace a akce" })
    .getByRole("link", { name: "Platby" })
    .click()
  await expect(page.getByText("Žádné nespárované transakce")).toBeVisible()

  const id = String(Date.now())
  const file = statement(
    movement(`${id}1`, "02.08.2027", "1 500,00", "1001", "Jan Novák"),
    movement(`${id}2`, "03.08.2027", "-200,00", "", "Obchod"),
    movement(`${id}3`, "04.08.2027", "400,00", `00${symbol}`, "Petra Nováková"),
  )
  await importStatement(page, file)
  const result = page.getByRole("status").filter({ hasText: "Výpis byl naimportován" })
  await expect(result).toContainText("Nové transakce2")
  await expect(result).toContainText("Spárováno podle variabilního symbolu1")
  await expect(result).toContainText("Přeskočené odchozí platby1")

  // Paired by its symbol (F24): a payment of Anna's registration, not in the queue.
  const balance = page
    .getByRole("region", { name: "Tabulka sald přihlášek" })
    .getByRole("row", { name: new RegExp(anna.firstName) })
  await expect(balance).toContainText("Částečně zaplaceno")
  await expect(balance).toContainText("600 Kč")
  const queue = page.getByRole("region", { name: "Tabulka nespárovaných transakcí" })
  await expect(queue.getByRole("row")).toHaveCount(2)
  const jan = queue.getByRole("row", { name: /Jan Novák/ })
  await expect(jan).toContainText("1 500 Kč")
  await expect(jan).toContainText("2. 8. 2027")
  await expect(jan).toContainText("1001")

  // The same statement again adds nothing and pairs nothing twice.
  await importStatement(page, file)
  await expect(result).toContainText("Nové transakce0")
  await expect(result).toContainText("Již dříve naimportované2")
  await expect(result).toContainText("Spárováno podle variabilního symbolu0")
  await expect(queue.getByRole("row")).toHaveCount(2)

  // By hand, with a reason: the overpayment shows at once.
  await jan.getByRole("button", { name: /^Přiřadit transakci/ }).click()
  const dialog = page.getByRole("dialog", { name: "Přiřadit transakci" })
  await dialog.getByRole("button", { name: "Přiřadit" }).click()
  await expect(dialog.getByText("Uveďte důvod přiřazení.")).toBeVisible()
  await dialog.getByRole("combobox", { name: "Přihláška" }).click()
  await page.getByRole("option", { name: new RegExp(`${anna.firstName} ${anna.lastName}`) }).click()
  await dialog.getByLabel("Důvod přiřazení").fill("Platil soused za Annu")
  await dialog.getByRole("button", { name: "Přiřadit" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText("Žádné nespárované transakce")).toBeVisible()
  await expect(balance).toHaveText(/Přeplatek\s*900\s*Kč$/)
  const payments = page.getByRole("region", { name: "Tabulka přijatých plateb" })
  await expect(payments.getByRole("row")).toHaveCount(3)

  // A paired payment leads to the right registration.
  await payments
    .getByRole("row", { name: /1\s500\sKč/ })
    .getByRole("link", { name: `Přihláška ${anna.firstName} ${anna.lastName}` })
    .click()
  await expect(page).toHaveURL(new RegExp(`/registrations/${registration.id}$`))
})

test("an empty statement imports zero transactions; a foreign file is refused", async ({
  page,
}) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}/payments`)

  await importStatement(page, statement())
  await expect(page.getByText("Výpis neobsahuje žádné přijaté platby")).toBeVisible()

  await importStatement(page, Buffer.from("jméno,příjmení\nJan,Novák"))
  await expect(page.getByText("Výpis nebyl naimportován")).toBeVisible()
  await expect(page.getByText(/Soubor není podporovaný výpis/)).toBeVisible()
  await expect(page.getByText("Žádné nespárované transakce")).toBeVisible()
})
