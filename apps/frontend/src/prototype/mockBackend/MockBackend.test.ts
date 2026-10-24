import { beforeEach, describe, expect, it } from "vitest"

import { HttpFailure, MockBackend } from "@/prototype/mockBackend/MockBackend"
import {
  DEMO,
  loadScenario,
  type OrganizerPersona,
  type ParticipantPersona,
} from "@/prototype/mockBackend/scenarios"

const { rosa, summerCamp, hike, technoklub } = DEMO

function demo(organizer: OrganizerPersona = "jana", participant: ParticipantPersona = "nobody") {
  const backend = new MockBackend()
  loadScenario(backend, "demo", { organizer, participant })
  return backend
}

function failure(run: () => unknown) {
  try {
    run()
  } catch (error) {
    if (error instanceof HttpFailure) return { status: error.status, ...error.body }
    throw error
  }
  throw new Error("expected the request to be refused")
}

const registrationInput = (overrides: Partial<{ email: string; termIds: string[] }> = {}) => ({
  submissionKey: crypto.randomUUID(),
  firstName: "Petra",
  lastName: "Malá",
  email: "petra.mala@example.cz",
  phone: "+420777123456",
  termIds: [summerCamp.terms.first],
  ...overrides,
})

describe("MockBackend", () => {
  let backend: MockBackend

  beforeEach(() => {
    backend = demo()
  })

  describe("organizations", () => {
    it("lists only the signed-in organizer's organizations, by name", () => {
      expect(backend.listOrganizations().map((organization) => organization.name)).toEqual([
        "Letní škola Pálava",
        "Skautský oddíl Rosa",
      ])
    })

    it("answers a foreign organization like a missing one", () => {
      expect(failure(() => backend.listEvents(technoklub.id))).toMatchObject({ status: 404 })
    })

    it("refuses everything without a session", () => {
      expect(failure(() => demo("nobody").listOrganizations())).toMatchObject({ status: 401 })
    })
  })

  describe("opening registration", () => {
    it("lists what is missing and refuses to open", () => {
      const winter = backend.getEvent(rosa.id, DEMO.winterCamp.id)
      expect(winter.openingBlockers).toEqual(["terms", "paymentSettings"])
      expect(failure(() => backend.openRegistration(rosa.id, DEMO.winterCamp.id))).toMatchObject({
        status: 409,
        code: "opening_conditions_not_met",
      })
    })

    it("opens a complete draft, locks it and publishes the link", () => {
      const opened = backend.openRegistration(rosa.id, hike.id)
      expect(opened).toMatchObject({ status: "open", isLocked: true, openingBlockers: [] })
      expect(backend.getPublicEvent(hike.publicId).name).toBe(hike.name)
      expect(
        failure(() =>
          backend.saveTerm(rosa.id, hike.id, null, {
            label: "Další",
            startDate: "2027-11-01",
            endDate: "2027-11-02",
            priceMinor: 0,
          }),
        ),
      ).toMatchObject({ status: 409, code: "event_locked" })
    })

    it("hides a draft from the public link", () => {
      expect(failure(() => backend.getPublicEvent(DEMO.winterCamp.publicId))).toMatchObject({
        status: 404,
      })
    })
  })

  describe("terms", () => {
    it("refuses an overlapping term at the start date", () => {
      backend.saveTerm(rosa.id, DEMO.winterCamp.id, null, {
        label: "Pololetky",
        startDate: "2027-02-01",
        endDate: "2027-02-05",
        priceMinor: 300_000,
      })
      expect(
        failure(() =>
          backend.saveTerm(rosa.id, DEMO.winterCamp.id, null, {
            label: "Jarňáky",
            startDate: "2027-02-05",
            endDate: "2027-02-09",
            priceMinor: 300_000,
          }),
        ),
      ).toMatchObject({ status: 409, code: "term_overlap", field: "startDate" })
    })
  })

  describe("payment settings", () => {
    it("checks the account number with the ČNB checksum", () => {
      expect(
        failure(() =>
          backend.updatePaymentSettings(rosa.id, DEMO.winterCamp.id, {
            bankAccountPrefix: null,
            bankAccountNumber: "1234567890",
            bankCode: "0800",
            paymentReminderDays: 14,
          }),
        ),
      ).toMatchObject({ status: 400, code: "bank_account_invalid", field: "bankAccountNumber" })
    })
  })

  describe("capacity", () => {
    it("derives capacity from beds and counts the waitlist apart", () => {
      expect(backend.getRooms(rosa.id, summerCamp.id).terms).toMatchObject([
        { label: "1. turnus", capacity: 10, confirmed: 4, free: 6, waitlisted: 0 },
        { label: "2. turnus", capacity: 4, confirmed: 4, free: 0, waitlisted: 2 },
      ])
    })

    it("confirms a term with a free bed and waitlists a full one in one registration", () => {
      const { result } = backend.submitRegistration(
        summerCamp.publicId,
        registrationInput({ termIds: [summerCamp.terms.second, summerCamp.terms.first] }),
      )
      expect(result.terms.map((term) => [term.label, term.status])).toEqual([
        ["1. turnus", "confirmed"],
        ["2. turnus", "waitlisted"],
      ])
      expect(result.selectedPriceMinor).toBe(900_000)
      expect(result.amountDueMinor).toBe(450_000)
      expect(result.paymentInstructions).toMatchObject({
        amountMinor: 450_000,
        variableSymbol: "1000062",
      })
    })

    it("asks for nothing when every chosen term is full", () => {
      const { result } = backend.submitRegistration(
        summerCamp.publicId,
        registrationInput({ termIds: [summerCamp.terms.second] }),
      )
      expect(result.amountDueMinor).toBe(0)
      expect(result.paymentInstructions).toBeNull()
    })

    it("never lets rooms take a term below its confirmed participants", () => {
      expect(
        failure(() =>
          backend.saveRoom(rosa.id, summerCamp.id, summerCamp.rooms.fox, {
            label: "Chatka Liška",
            bedCount: 1,
            termIds: [summerCamp.terms.first, summerCamp.terms.second],
          }),
        ),
      ).toMatchObject({ status: 409, code: "capacity_below_confirmed" })
    })
  })

  describe("registrations", () => {
    it("keeps one registration per e-mail and event, whatever the case", () => {
      expect(
        failure(() =>
          backend.submitRegistration(
            summerCamp.publicId,
            registrationInput({ email: " Anna.Novakova@example.cz " }),
          ),
        ),
      ).toMatchObject({ status: 409, code: "already_registered" })
    })

    it("answers a retried submission with the stored result instead of a duplicate", () => {
      const input = registrationInput()
      const first = backend.submitRegistration(summerCamp.publicId, input)
      const retry = backend.submitRegistration(summerCamp.publicId, input)
      expect(retry).toEqual({ isCreated: false, result: first.result })
      expect(backend.listRegistrations(rosa.id, summerCamp.id, {}).total).toBe(9)
    })

    it("filters term and status on the same term", () => {
      const list = backend.listRegistrations(rosa.id, summerCamp.id, {
        termId: summerCamp.terms.second,
        status: "waitlisted",
      })
      expect(list.registrations.map((registration) => registration.firstName)).toEqual([
        "Klára",
        "Filip",
      ])
      expect(list.total).toBe(8)
    })

    it("moves a registration from unpaid through partial to paid", () => {
      const pay = (amountMinor: number) =>
        backend.recordPayment(rosa.id, summerCamp.id, DEMO.registrations.annaSummer, {
          submissionKey: crypto.randomUUID(),
          amountMinor,
          receivedOn: "2026-10-01",
        })
      expect(
        backend.getRegistration(rosa.id, summerCamp.id, DEMO.registrations.annaSummer),
      ).toMatchObject({
        paymentState: "unpaid",
      })
      expect(pay(200_000)).toMatchObject({ paymentState: "partial", balanceMinor: 250_000 })
      expect(pay(250_000)).toMatchObject({
        paymentState: "paid",
        balanceMinor: 0,
        reminderAt: expect.any(String) as string,
      })
      expect(pay(1_000)).toMatchObject({ paymentState: "overpaid", balanceMinor: -1_000 })
    })

    it("refuses a payment received in the future", () => {
      expect(
        failure(() =>
          backend.recordPayment(rosa.id, summerCamp.id, DEMO.registrations.annaSummer, {
            submissionKey: crypto.randomUUID(),
            amountMinor: 1_000,
            receivedOn: "2999-01-01",
          }),
        ),
      ).toMatchObject({ status: 400, code: "received_on_future", field: "receivedOn" })
    })
  })

  describe("participant access", () => {
    it("mails a single-use link only to an e-mail with registrations", () => {
      backend.requestMagicLink("nikdo@example.cz")
      expect(backend.emails).toHaveLength(0)

      backend.requestMagicLink(DEMO.anna.email)
      const [email] = backend.emails
      const token = new URLSearchParams(email!.action.path.split("?")[1]).get("token")!

      backend.openParticipantSession(token)
      expect(
        backend.participantRegistrations().map((registration) => registration.event.name),
      ).toEqual([DEMO.robotics.name, summerCamp.name])
      expect(failure(() => backend.openParticipantSession(token))).toMatchObject({
        status: 401,
        code: "magic_link_invalid",
      })
    })

    it("shows payment instructions only while a debt remains", () => {
      const participant = demo("nobody", "anna")
      const [robotics, summer] = participant.participantRegistrations()
      expect(robotics!.paymentInstructions).toBeNull()
      expect(summer!.paymentInstructions).toMatchObject({ amountMinor: 450_000 })
    })

    it("never shows someone else's registration", () => {
      const participant = demo("nobody", "anna")
      expect(
        failure(() => participant.getParticipantRegistration(DEMO.registrations.jakub)),
      ).toMatchObject({
        status: 404,
      })
    })
  })
})
