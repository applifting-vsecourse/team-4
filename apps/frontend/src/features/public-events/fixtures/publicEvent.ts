import {
  catalogEventSchema,
  catalogListSchema,
  publicEventSchema,
  type CatalogEvent,
  type CatalogItem,
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

/** The public catalog (F54-2a): events of several organizations. */
export const CATALOG_LIST: CatalogItem[] = catalogListSchema.parse([
  {
    publicId: PUBLIC_ID,
    name: PUBLIC_EVENT.name,
    organizationName: "Spolek Modrá Hora",
    location: "Tábořiště Modrá Hora, Hlinsko",
    coverPhotoId: uuid(401),
    terms: PUBLIC_EVENT.terms.map(({ id, label, startDate, endDate }) => ({
      id,
      label,
      startDate,
      endDate,
    })),
  },
  {
    publicId: "mesto-hrou-2027",
    name: "Příměstský tábor Město hrou",
    organizationName: "Dům dětí a mládeže Praha 4",
    location: "DDM Praha 4, Praha",
    // The organizer added no photo: the card shows the default image.
    coverPhotoId: null,
    terms: [
      { id: uuid(201), label: "Týden 1", startDate: "2027-07-19", endDate: "2027-07-23" },
      { id: uuid(202), label: "Týden 2", startDate: "2027-08-09", endDate: "2027-08-13" },
    ],
  },
  {
    publicId: "podzimni-vikend-2027",
    name: "Podzimní víkend pro mladé organizátory",
    organizationName: "Junák Brno",
    location: "Skautská základna Kameňák, Brno",
    coverPhotoId: null,
    terms: [{ id: uuid(301), label: "Víkend", startDate: "2027-10-15", endDate: "2027-10-17" }],
  },
])
