// Brand directions A/B/C (S5-T03-1, POC): one set of content for all six screens, so the
// directions differ only in composition, colour, type and icons. Values are already formatted.

export type TermStatus = "confirmed" | "waitlisted" | "pending" | "cancelled"
export type PaymentStatus = "none" | "unpaid" | "partial" | "paid"

export const TERM_STATUS_LABELS: Record<TermStatus, string> = {
  confirmed: "Potvrzeno",
  waitlisted: "Náhradník",
  pending: "Čeká na rozhodnutí",
  cancelled: "Odhlášeno",
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  none: "Bez povinnosti",
  unpaid: "Nezaplaceno",
  partial: "Částečně",
  paid: "Zaplaceno",
}

export const TERM_STATUS_TONE = {
  confirmed: "success",
  waitlisted: "warning",
  pending: "secondary",
  cancelled: "outline",
} as const satisfies Record<TermStatus, string>

export const PAYMENT_STATUS_TONE = {
  none: "secondary",
  unpaid: "outline",
  partial: "warning",
  paid: "success",
} as const satisfies Record<PaymentStatus, string>

export const EVENT = {
  name: "Letní tábor Modrá Hora 2027",
  organization: "Spolek Modrá Hora",
  location: "Tábořiště Modrá Hora, Horní Lhota 12, Hlinsko",
  dates: "5. 7. – 15. 8. 2027",
  deadline: "Přihlášky do 31. 5. 2027",
  age: "11–15 let",
  summary:
    "Dva týdny v lesním táboře: celotáborová hra, výlety po okolí a večery u ohně. Spaní ve chatkách, strava pětkrát denně.",
  conditions: [
    "Věk účastníka 11 až 15 let.",
    "Zdravotní způsobilost potvrzená rodičem při přihlášce.",
    "Záloha 2 000 Kč je splatná do 7 dnů od přihlášení.",
    "Při odhlášení do 30 dnů před začátkem turnusu vracíme celou zálohu, později 50 %.",
  ],
}

export type BrandTerm = {
  id: string
  label: string
  dates: string
  price: string
  availability: string
  isFull: boolean
}

export const TERMS: BrandTerm[] = [
  {
    id: "t1",
    label: "Turnus 1",
    dates: "5.–18. 7. 2027",
    price: "4 500 Kč",
    availability: "Volno 12 míst",
    isFull: false,
  },
  {
    id: "t2",
    label: "Turnus 2",
    dates: "2.–15. 8. 2027",
    price: "4 500 Kč",
    availability: "Obsazeno, přihláška jako náhradník",
    isFull: true,
  },
  {
    id: "t3",
    label: "Instruktorský víkend pro starší účastníky a budoucí vedoucí oddílů",
    dates: "13.–15. 8. 2027",
    price: "1 200 Kč",
    availability: "Volno 4 místa",
    isFull: false,
  },
]

/** The default state of every registration screen: Turnus 1 picked, contact half filled. */
export const FORM = {
  selectedTermIds: ["t1"],
  total: "4 500 Kč",
  firstName: "Tereza",
  lastName: "Nováková",
  birthDate: "14. 3. 2014",
  email: "tereza.novakova@example.cz",
  phone: "777 123 456",
  schools: ["ZŠ Lipová", "ZŠ Dubová", "Jiná škola"],
  troops: ["Lišky", "Vlci", "Zatím žádný"],
  transport: ["Společný autobus z Prahy", "Vlastní doprava"],
  diets: ["Bez omezení", "Vegetariánská", "Bezlepková", "Jiná"],
  genders: ["Dívka", "Chlapec", "Jiné", "Nechci uvést"],
}

export type BrandRegistration = {
  id: string
  name: string
  email: string
  phone: string
  received: string
  terms: { label: string; status: TermStatus }[]
  payment: PaymentStatus
  total: string
  paid: string
  note?: string
}

export const REGISTRATIONS: BrandRegistration[] = [
  {
    id: "r1",
    name: "Anna Nováková",
    email: "anna.novakova@example.cz",
    phone: "+420 777 123 456",
    received: "2. 3. 2027 18:42",
    terms: [{ label: "Turnus 1", status: "confirmed" }],
    payment: "paid",
    total: "4 500 Kč",
    paid: "4 500 Kč",
  },
  {
    id: "r2",
    name: "Jakub Dvořák",
    email: "dvorak.rodina@example.cz",
    phone: "+420 603 555 120",
    received: "3. 3. 2027 7:15",
    terms: [
      { label: "Turnus 1", status: "confirmed" },
      { label: "Turnus 2", status: "waitlisted" },
    ],
    payment: "partial",
    total: "9 000 Kč",
    paid: "2 000 Kč",
  },
  {
    id: "r3",
    name: "Marie Terezie Hohenzollern-Sigmaringenová Wittelsbachová",
    email: "marie.terezie.hohenzollern-sigmaringen@example-dlouha-domena.cz",
    phone: "+420 721 004 998",
    received: "3. 3. 2027 21:03",
    terms: [
      { label: "Turnus 2", status: "waitlisted" },
      {
        label: "Instruktorský víkend pro starší účastníky a budoucí vedoucí oddílů",
        status: "pending",
      },
    ],
    payment: "unpaid",
    total: "5 700 Kč",
    paid: "0 Kč",
  },
  {
    id: "r4",
    name: "Eliška Svobodová",
    email: "eliska.svobodova@example.cz",
    phone: "+420 608 221 774",
    received: "5. 3. 2027 12:30",
    terms: [{ label: "Turnus 1", status: "confirmed" }],
    payment: "unpaid",
    total: "4 500 Kč",
    paid: "0 Kč",
  },
  {
    id: "r5",
    name: "Tomáš Černý",
    email: "tomas.cerny@example.cz",
    phone: "+420 731 880 410",
    received: "6. 3. 2027 9:58",
    terms: [{ label: "Turnus 2", status: "pending" }],
    payment: "none",
    total: "—",
    paid: "—",
  },
  {
    id: "r6",
    name: "Klára Procházková",
    email: "klara.p@example.cz",
    phone: "+420 776 314 159",
    received: "8. 3. 2027 16:21",
    terms: [{ label: "Turnus 1", status: "cancelled" }],
    payment: "none",
    total: "—",
    paid: "—",
  },
  {
    id: "r7",
    name: "Vojtěch Kučera",
    email: "vojta.kucera@example.cz",
    phone: "+420 702 600 330",
    received: "9. 3. 2027 20:47",
    terms: [
      { label: "Turnus 1", status: "confirmed" },
      {
        label: "Instruktorský víkend pro starší účastníky a budoucí vedoucí oddílů",
        status: "confirmed",
      },
    ],
    payment: "paid",
    total: "5 700 Kč",
    paid: "5 700 Kč",
  },
]

/** Amount left to pay per registration: the deciding figure. */
export const REMAINING: Record<string, string> = {
  r1: "0 Kč",
  r2: "7 000 Kč",
  r3: "5 700 Kč",
  r4: "4 500 Kč",
  r5: "—",
  r6: "—",
  r7: "0 Kč",
}

export const LIST = {
  total: 48,
  shown: REGISTRATIONS.length,
  updated: "Aktualizováno 10. 3. 2027 9:12",
  counts: [
    { id: "all", label: "Vše", count: 48 },
    { id: "pending", label: "Čeká na rozhodnutí", count: 6 },
    { id: "waitlisted", label: "Náhradníci", count: 9 },
    { id: "unpaid", label: "Nezaplaceno", count: 12 },
  ],
  terms: ["Všechny termíny", "Turnus 1", "Turnus 2", "Instruktorský víkend"],
  payments: ["Všechny platby", "Nezaplaceno", "Částečně", "Zaplaceno"],
}

/** Event management navigation, the same items in every direction. */
export type NavKey = "overview" | "registrations" | "payments" | "rooms" | "programme" | "settings"

const EVENT_PATH = "/organizations/spolek-modra-hora/events/letni-tabor-2027"

export const EVENT_NAV: { key: NavKey; label: string; href: string; isActive: boolean }[] = [
  { key: "overview", label: "Přehled", href: `${EVENT_PATH}/overview`, isActive: false },
  { key: "registrations", label: "Přihlášky", href: `${EVENT_PATH}/registrations`, isActive: true },
  { key: "payments", label: "Platby", href: `${EVENT_PATH}/payments`, isActive: false },
  { key: "rooms", label: "Ubytování", href: `${EVENT_PATH}/rooms`, isActive: false },
  { key: "programme", label: "Program", href: `${EVENT_PATH}/programme`, isActive: false },
  { key: "settings", label: "Nastavení", href: `${EVENT_PATH}/settings`, isActive: false },
]

/** Pages of Přihlášky; the list is the current one. */
export const REGISTRATION_TABS = [
  { label: "Seznam přihlášek", href: `${EVENT_PATH}/registrations`, count: 48, isActive: true },
  {
    label: "Ke schválení",
    href: `${EVENT_PATH}/registrations/approvals`,
    count: 6,
    isActive: false,
  },
  { label: "Vyhodnocení", href: `${EVENT_PATH}/registrations/evaluation`, isActive: false },
]

/** Link of a registration's detail. */
export const registrationHref = (id: string) => `${EVENT_PATH}/registrations/${id}`

export type ListState = "ready" | "loading" | "empty" | "no-results"

/** Filter options with counts over all 48 registrations. */
export const FACETS = {
  participation: [
    { label: "Potvrzeno", count: 27 },
    { label: "Náhradník", count: 9 },
    { label: "Čeká na rozhodnutí", count: 6 },
    { label: "Odhlášeno", count: 6 },
  ],
  payment: [
    { label: "Nezaplaceno", count: 12 },
    { label: "Částečně", count: 8 },
    { label: "Zaplaceno", count: 19 },
    { label: "Bez povinnosti", count: 9 },
  ],
  terms: [
    { label: "Turnus 1", count: 31 },
    { label: "Turnus 2", count: 14 },
    { label: "Instruktorský víkend", count: 7 },
  ],
}

/** Steps of a stepped registration form; the form keeps every value when moving between them. */
export const STEPS = ["Termíny", "Účastník a kontakt", "Doplňující údaje", "Souhrn a odeslání"]

export type StepNumber = 1 | 2 | 3 | 4
