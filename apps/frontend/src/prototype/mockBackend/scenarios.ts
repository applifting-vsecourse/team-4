import { paymentReminderAt } from "@/prototype/mockBackend/domain"
import { mockId, type MockBackend } from "@/prototype/mockBackend/MockBackend"
import {
  type MockData,
  type MockEvent,
  type MockRegistration,
  type MockSessions,
} from "@/prototype/mockBackend/model"

// The worlds a prototype can start in. Values are fixed (no Date.now(), no
// random ids) so every story opens on the same data; only what is created
// while clicking gets the current time.

export const PASSWORD = "akcio-demo"

const user = (n: number, name: string, email: string) => ({
  id: mockId(n),
  name,
  email,
  password: PASSWORD,
})

/** Ids and names stories navigate by. */
export const DEMO = {
  jana: user(1, "Jana Nováková", "jana@akcio.cz"),
  petr: user(2, "Petr Svoboda", "petr@akcio.cz"),
  eva: user(3, "Eva Malá", "eva@akcio.cz"),
  rosa: { id: mockId(11), name: "Skautský oddíl Rosa" },
  palava: { id: mockId(12), name: "Letní škola Pálava" },
  technoklub: { id: mockId(13), name: "Technoklub Praha" },
  /** Open, locked, two terms; the second is full and has a waitlist. */
  summerCamp: {
    id: mockId(21),
    organizationId: mockId(11),
    publicId: "k7Qm2xPa",
    name: "Letní tábor Rosa 2027",
    terms: { first: mockId(31), second: mockId(32) },
    rooms: { fox: mockId(41), owl: mockId(42), tent: mockId(43) },
  },
  /** Draft with everything filled in: ready to open. */
  hike: {
    id: mockId(22),
    organizationId: mockId(11),
    publicId: "jz4Lw9Td",
    name: "Podzimní výprava do Jizerek",
  },
  /** Draft without terms and payment settings. */
  winterCamp: {
    id: mockId(23),
    organizationId: mockId(11),
    publicId: "wn5Rt8Kc",
    name: "Zimní soustředění",
  },
  /** Petr's open event: another organization's data. */
  robotics: {
    id: mockId(24),
    organizationId: mockId(13),
    publicId: "rb8Nc3Hs",
    name: "Příměstský tábor Robotika",
  },
  /** Participant with registrations in two organizations' events. */
  anna: { email: "anna.novakova@example.cz", name: "Anna Nováková" },
  registrations: {
    annaSummer: mockId(51),
    jakub: mockId(52),
    eliska: mockId(53),
    tomas: mockId(54),
    klara: mockId(57),
    filip: mockId(58),
    annaRobotics: mockId(61),
  },
  /** An id that exists nowhere. */
  missing: mockId(999_999),
} as const

const ROSA_ACCOUNT = { prefix: null, number: "2000145399", bankCode: "0800" }
const TECHNOKLUB_ACCOUNT = { prefix: "19", number: "2000145399", bankCode: "0800" }

function registration(
  n: number,
  input: Pick<
    MockRegistration,
    "eventId" | "receivedAt" | "firstName" | "lastName" | "email" | "phone" | "terms"
  > & {
    account: MockRegistration["account"]
    reminderDays: number
    hasDebt: boolean
    payments?: { receivedOn: string; amountMinor: number }[]
  },
): MockRegistration {
  const { account, reminderDays, hasDebt, payments = [], ...rest } = input
  return {
    ...rest,
    id: mockId(n),
    submissionKey: mockId(5000 + n),
    variableSymbol: String(1_000_000 + n),
    account,
    reminderAt: hasDebt ? paymentReminderAt(input.receivedAt, reminderDays) : null,
    payments: payments.map((payment, index) => ({
      id: mockId(7000 + n * 10 + index),
      submissionKey: mockId(8000 + n * 10 + index),
      ...payment,
    })),
  }
}

function demoData(): MockData {
  const { summerCamp, hike, winterCamp, robotics } = DEMO
  const first = summerCamp.terms.first
  const second = summerCamp.terms.second
  const roboticsWeek = mockId(34)

  const events: MockEvent[] = [
    {
      id: summerCamp.id,
      organizationId: DEMO.rosa.id,
      publicId: summerCamp.publicId,
      name: summerCamp.name,
      description:
        "Dva týdny v lesích u Hrachova: hry, táboráky, výlety do okolí a celotáborová hra.\nPro děti od 7 do 12 let.",
      location: "Tábořiště Hrachov",
      status: "open",
      isLocked: true,
      createdAt: "2026-08-01T09:00:00.000Z",
      terms: [
        {
          id: first,
          label: "1. turnus",
          startDate: "2027-07-04",
          endDate: "2027-07-17",
          priceMinor: 450_000,
        },
        {
          id: second,
          label: "2. turnus",
          startDate: "2027-07-18",
          endDate: "2027-07-31",
          priceMinor: 450_000,
        },
      ],
      rooms: [
        { id: summerCamp.rooms.fox, label: "Chatka Liška", bedCount: 4, termIds: [first, second] },
        { id: summerCamp.rooms.owl, label: "Chatka Sova", bedCount: 4, termIds: [first] },
        { id: summerCamp.rooms.tent, label: "Stan u potoka", bedCount: 2, termIds: [first] },
      ],
      paymentSettings: {
        bankAccountPrefix: null,
        bankAccountNumber: "2000145399",
        bankCode: "0800",
        paymentReminderDays: 14,
      },
    },
    {
      id: hike.id,
      organizationId: DEMO.rosa.id,
      publicId: hike.publicId,
      name: hike.name,
      description: "Prodloužený víkend na hřebenech Jizerských hor pro starší skauty.",
      location: "Chata Smědava",
      status: "draft",
      isLocked: false,
      createdAt: "2026-09-05T09:00:00.000Z",
      terms: [
        {
          id: mockId(33),
          label: "Víkend",
          startDate: "2027-10-08",
          endDate: "2027-10-10",
          priceMinor: 120_000,
        },
      ],
      rooms: [{ id: mockId(44), label: "Turistická chata", bedCount: 12, termIds: [mockId(33)] }],
      paymentSettings: {
        bankAccountPrefix: null,
        bankAccountNumber: "2000145399",
        bankCode: "0800",
        paymentReminderDays: 10,
      },
    },
    {
      id: winterCamp.id,
      organizationId: DEMO.rosa.id,
      publicId: winterCamp.publicId,
      name: winterCamp.name,
      description: "Lyžařský výcvik a večerní program pro celý oddíl.",
      location: "Horní Mísečky",
      status: "draft",
      isLocked: false,
      createdAt: "2026-10-01T09:00:00.000Z",
      terms: [],
      rooms: [],
      paymentSettings: null,
    },
    {
      id: robotics.id,
      organizationId: DEMO.technoklub.id,
      publicId: robotics.publicId,
      name: robotics.name,
      description: "Stavíme a programujeme roboty. Obědy a svačiny v ceně.",
      location: "Praha 7 – Holešovice",
      status: "open",
      isLocked: true,
      createdAt: "2026-07-15T09:00:00.000Z",
      terms: [
        {
          id: roboticsWeek,
          label: "Týden 1",
          startDate: "2027-07-12",
          endDate: "2027-07-16",
          priceMinor: 390_000,
        },
      ],
      rooms: [{ id: mockId(45), label: "Klubovna", bedCount: 12, termIds: [roboticsWeek] }],
      paymentSettings: {
        bankAccountPrefix: "19",
        bankAccountNumber: "2000145399",
        bankCode: "0800",
        paymentReminderDays: 7,
      },
    },
  ]

  const summer = { eventId: summerCamp.id, account: ROSA_ACCOUNT, reminderDays: 14 }
  const confirmed = (termId: string) => ({ termId, status: "confirmed" as const })
  const waitlisted = (termId: string) => ({ termId, status: "waitlisted" as const })

  // 1. turnus: 10 beds, 4 confirmed. 2. turnus: 4 beds, all taken, 2 waiting.
  const registrations = [
    registration(51, {
      ...summer,
      receivedAt: "2026-09-14T08:30:00.000Z",
      firstName: "Anna",
      lastName: "Nováková",
      email: DEMO.anna.email,
      phone: "+420601234567",
      terms: [confirmed(first)],
      hasDebt: true,
    }),
    registration(52, {
      ...summer,
      receivedAt: "2026-09-14T17:40:00.000Z",
      firstName: "Jakub",
      lastName: "Dvořák",
      email: "jakub.dvorak@example.cz",
      phone: "+420602345678",
      terms: [confirmed(first), confirmed(second)],
      hasDebt: true,
      payments: [{ receivedOn: "2026-09-20", amountMinor: 450_000 }],
    }),
    registration(53, {
      ...summer,
      receivedAt: "2026-09-15T07:05:00.000Z",
      firstName: "Eliška",
      lastName: "Svobodová",
      email: "eliska.svobodova@example.cz",
      phone: "+420603456789",
      terms: [confirmed(first)],
      hasDebt: true,
      payments: [{ receivedOn: "2026-09-18", amountMinor: 450_000 }],
    }),
    registration(54, {
      ...summer,
      receivedAt: "2026-09-16T12:30:00.000Z",
      firstName: "Tomáš",
      lastName: "Černý",
      email: "tomas.cerny@example.cz",
      phone: "+420604567890",
      terms: [confirmed(second)],
      hasDebt: true,
      payments: [{ receivedOn: "2026-09-22", amountMinor: 500_000 }],
    }),
    registration(55, {
      ...summer,
      receivedAt: "2026-09-17T18:15:00.000Z",
      firstName: "Ondřej",
      lastName: "Malý",
      email: "ondrej.maly@example.cz",
      phone: "+420605678901",
      terms: [confirmed(second)],
      hasDebt: true,
      payments: [{ receivedOn: "2026-09-25", amountMinor: 450_000 }],
    }),
    registration(56, {
      ...summer,
      receivedAt: "2026-09-18T06:50:00.000Z",
      firstName: "Barbora",
      lastName: "Králová",
      email: "barbora.kralova@example.cz",
      phone: "+420606789012",
      terms: [confirmed(second)],
      hasDebt: true,
    }),
    registration(57, {
      ...summer,
      receivedAt: "2026-09-20T20:10:00.000Z",
      firstName: "Klára",
      lastName: "Procházková",
      email: "klara.prochazkova@example.cz",
      phone: "+420607890123",
      terms: [waitlisted(second)],
      hasDebt: false,
    }),
    registration(58, {
      ...summer,
      receivedAt: "2026-09-21T10:00:00.000Z",
      firstName: "Filip",
      lastName: "Novotný",
      email: "filip.novotny@example.cz",
      phone: "+420608901234",
      terms: [confirmed(first), waitlisted(second)],
      hasDebt: true,
    }),
    registration(61, {
      eventId: robotics.id,
      account: TECHNOKLUB_ACCOUNT,
      reminderDays: 7,
      receivedAt: "2026-09-30T15:20:00.000Z",
      firstName: "Anna",
      lastName: "Nováková",
      email: DEMO.anna.email,
      phone: "+420601234567",
      terms: [confirmed(roboticsWeek)],
      hasDebt: true,
      payments: [{ receivedOn: "2026-10-02", amountMinor: 390_000 }],
    }),
  ]

  return {
    users: [DEMO.jana, DEMO.petr, DEMO.eva],
    organizations: [
      { ...DEMO.rosa, ownerId: DEMO.jana.id },
      { ...DEMO.palava, ownerId: DEMO.jana.id },
      { ...DEMO.technoklub, ownerId: DEMO.petr.id },
    ],
    events,
    registrations,
  }
}

export const SCENARIOS = {
  /** Three organizers, three organizations, four events, nine registrations. */
  demo: demoData,
  /** Nobody and nothing yet: start from sign-up. */
  blank: (): MockData => ({ users: [], organizations: [], events: [], registrations: [] }),
} satisfies Record<string, () => MockData>

export type ScenarioName = keyof typeof SCENARIOS

/** Who is signed in as an organizer when the story opens. */
export const ORGANIZERS = {
  nobody: null,
  jana: DEMO.jana.id,
  petr: DEMO.petr.id,
  eva: DEMO.eva.id,
} as const

/** Who has a verified participant session when the story opens. */
export const PARTICIPANTS = { nobody: null, anna: DEMO.anna.email } as const

export type OrganizerPersona = keyof typeof ORGANIZERS
export type ParticipantPersona = keyof typeof PARTICIPANTS

export function loadScenario(
  backend: MockBackend,
  scenario: ScenarioName,
  personas: { organizer: OrganizerPersona; participant: ParticipantPersona },
) {
  const sessions: MockSessions = {
    organizerId: ORGANIZERS[personas.organizer],
    participantEmail: PARTICIPANTS[personas.participant],
  }
  backend.load(SCENARIOS[scenario](), sessions)
}
