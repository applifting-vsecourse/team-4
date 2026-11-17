import { expect, test, type Page } from "@playwright/test"

import { setUpEvent } from "./support/api"

// Import výpisu (F23): from the event overview to Platby, a statement in the
// internet banking's CSV export, its repetition and a refused file.

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

test("the organizer imports a statement into Platby, once", async ({ page }) => {
  const event = await setUpEvent(page.request, { terms, rooms })
  await page.goto(`/organizations/${event.organizationId}/events/${event.eventId}`)
  await page
    .getByRole("navigation", { name: "Navigace organizace a akce" })
    .getByRole("link", { name: "Platby" })
    .click()
  await expect(page.getByText("Zatím žádné přijaté transakce")).toBeVisible()

  const id = String(Date.now())
  const file = statement(
    movement(`${id}1`, "02.08.2027", "1 500,00", "1001", "Jan Novák"),
    movement(`${id}2`, "03.08.2027", "-200,00", "", "Obchod"),
  )
  await importStatement(page, file)
  const result = page.getByRole("status").filter({ hasText: "Výpis byl naimportován" })
  await expect(result).toContainText("Nové transakce1")
  await expect(result).toContainText("Přeskočené odchozí platby1")
  const table = page.getByRole("region", { name: "Tabulka přijatých transakcí" })
  await expect(table.getByRole("row", { name: /Jan Novák/ })).toContainText("1 500 Kč")
  await expect(table.getByRole("row", { name: /Jan Novák/ })).toContainText("2. 8. 2027")
  await expect(table.getByRole("row", { name: /Jan Novák/ })).toContainText("1001")

  // The same statement again adds nothing.
  await importStatement(page, file)
  await expect(result).toContainText("Nové transakce0")
  await expect(result).toContainText("Již dříve naimportované1")
  await expect(table.getByRole("row")).toHaveCount(2)
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
  await expect(page.getByText("Zatím žádné přijaté transakce")).toBeVisible()
})
