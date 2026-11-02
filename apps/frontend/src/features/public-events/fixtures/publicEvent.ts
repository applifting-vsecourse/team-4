import {
  catalogEventSchema,
  publicEventSchema,
  type CatalogEvent,
  type PublicEvent,
} from "@/features/public-events/api/publicEventSchemas"

// Preview data, parsed with the API schemas so it can't drift from the
// contract: the public face of the open summer camp.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

export const PUBLIC_ID = "letni-tabor-2027"

export const PUBLIC_EVENT: PublicEvent = publicEventSchema.parse({
  name: "Letní tábor Modrá Hora 2027",
  description:
    "Dva týdny v lesním táboře pod Modrou Horou: celotáborová hra, výlety po okolí a večery u ohně. Ubytování ve chatkách, strava pětkrát denně.",
  location: "Tábořiště Modrá Hora, Horní Lhota 12, 539 01 Hlinsko",
  terms: [
    {
      id: uuid(101),
      label: "Turnus 1",
      startDate: "2027-07-04",
      endDate: "2027-07-17",
      priceMinor: 450_000,
    },
    {
      id: uuid(102),
      label: "Turnus 2",
      startDate: "2027-08-01",
      endDate: "2027-08-14",
      priceMinor: 450_000,
    },
  ],
  isPublished: true,
})

/** Its catalog detail (F55): published, open, with photos and a public contact. */
export const CATALOG_EVENT: CatalogEvent = catalogEventSchema.parse({
  name: PUBLIC_EVENT.name,
  organizationName: "Spolek Modrá Hora",
  description: PUBLIC_EVENT.description,
  location: PUBLIC_EVENT.location,
  conditions:
    "Věk účastníka 11 až 15 let.\nZdravotní způsobilost potvrzená rodičem při přihlášce.\nZáloha 2 000 Kč je splatná do 7 dnů od přihlášení.",
  contact: { name: "Jana Nováková", email: "tabor@modrahora.example", phone: "+420604123456" },
  photos: [{ id: uuid(401) }, { id: uuid(402) }],
  registrationStatus: "open",
  terms: PUBLIC_EVENT.terms,
})
