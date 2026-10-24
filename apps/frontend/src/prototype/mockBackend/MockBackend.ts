import { todayInPrague } from "@/lib/date"
import {
  amountDueMinor,
  decideParticipation,
  findInvalidAccountField,
  findOpeningBlockers,
  MAGIC_LINK_LIFETIME_MS,
  MAX_PAYMENT_MINOR,
  normalizeEmail,
  paymentReminderAt,
  paymentState,
  rangesOverlap,
} from "@/prototype/mockBackend/domain"
import {
  type MockData,
  type MockEmail,
  type MockEvent,
  type MockRegistration,
  type MockRoom,
  type MockSessions,
  type MockUser,
} from "@/prototype/mockBackend/model"

import {
  type EventDetail,
  type EventInput,
  type EventSummary,
  type TermInput,
} from "@/features/events/api/eventSchemas"
import { type PaymentSettings } from "@/features/events/api/paymentSettingsSchemas"
import { type Organization } from "@/features/organizations/api/organizationSchemas"
import { type PublicEvent } from "@/features/public-events/api/publicEventSchemas"
import {
  type RegistrationDetail,
  type RegistrationFilter,
  type RegistrationList,
  type RegistrationSummary,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { type ParticipantRegistration } from "@/features/registrations/api/participantRegistrationSchemas"
import {
  type RegistrationInput,
  type RegistrationResult,
} from "@/features/registrations/api/registrationSchemas"
import {
  type RoomInput,
  type RoomsOverview,
  type TermOccupancy,
} from "@/features/rooms/api/roomSchemas"

/** A refused request: the status and the JSON body the real API answers with. */
export class HttpFailure extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    super(typeof body.message === "string" ? body.message : `HTTP ${status}`)
  }
}

// Error bodies as NestJS and the services in apps/backend produce them.
const notAvailable = () =>
  new HttpFailure(404, { statusCode: 404, message: "Záznam není dostupný", error: "Not Found" })
const unauthorized = () => new HttpFailure(401, { statusCode: 401, message: "Unauthorized" })
const conflict = (body: Record<string, unknown>) =>
  new HttpFailure(409, { statusCode: 409, ...body })
const badRequest = (body: Record<string, unknown>) =>
  new HttpFailure(400, { statusCode: 400, ...body })

const locked = () =>
  conflict({
    code: "event_locked",
    message: "Od prvního otevření přihlašování nelze měnit údaje akce, termíny ani ceny.",
  })

export const LINK_REQUESTED_MESSAGE =
  "Pokud k tomuto e-mailu existují přihlášky, pošleme vám přihlašovací odkaz."

/** Ids the mock creates; seeds use small numbers, so the two never clash. */
export const mockId = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

type MagicLink = { token: string; email: string; expiresAt: number; isUsed: boolean }

const EMPTY: MockData = { users: [], organizations: [], events: [], registrations: [] }

const byStart = <T extends { startDate: string; id: string }>(a: T, b: T) =>
  a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id)

/**
 * The akc.io API in memory, for page previews and clickable prototypes. It
 * keeps the rules of apps/backend that the UI depends on (isolation of
 * organizations, locking, capacity from beds, waitlist, payment states,
 * single-use magic links) so a whole workflow can be clicked through.
 * State lives until the next `load`; nothing is persisted.
 */
export class MockBackend {
  private network = { latency: 0, isServerDown: false }

  private data: MockData = structuredClone(EMPTY)
  private sessions: MockSessions = { organizerId: null, participantEmail: null }
  private magicLinks: MagicLink[] = []
  private sent: MockEmail[] = []
  private sequence = 0
  private nextVariableSymbol = 1_000_001
  private version = 0
  private listeners = new Set<() => void>()

  load(data: MockData, sessions: MockSessions) {
    this.data = structuredClone(data)
    this.sessions = { ...sessions }
    this.magicLinks = []
    this.sent = []
    this.sequence = 0
    const symbols = data.registrations.map((registration) => Number(registration.variableSymbol))
    this.nextVariableSymbol = Math.max(1_000_000, ...symbols) + 1
    this.changed()
  }

  /** Read by every handler on each request. */
  get config(): Readonly<{ latency: number; isServerDown: boolean }> {
    return this.network
  }

  configure(network: { latency: number; isServerDown: boolean }) {
    this.network = { ...network }
  }

  // ---- Observing (the prototype controls re-render on every change) ----

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  getVersion = () => this.version

  /** Newest first. */
  get emails(): readonly MockEmail[] {
    return this.sent
  }

  get signedInOrganizer(): MockUser | null {
    return this.data.users.find((user) => user.id === this.sessions.organizerId) ?? null
  }

  get signedInParticipant(): string | null {
    return this.sessions.participantEmail
  }

  /** Events whose public link currently shows the registration form. */
  get openEvents() {
    return this.data.events
      .filter((event) => event.status === "open")
      .map((event) => ({ name: event.name, publicId: event.publicId }))
  }

  /** As if the 7-day participant cookie expired: the next request is refused. */
  endParticipantSession() {
    this.sessions.participantEmail = null
    this.changed()
  }

  private changed() {
    this.version++
    for (const listener of this.listeners) listener()
  }

  private newId() {
    this.sequence++
    return mockId(900_000 + this.sequence)
  }

  // ---- Organizer sign-in (BetterAuth) ----

  getSession() {
    return this.signedInOrganizer
  }

  signIn(email: string, password: string) {
    const user = this.data.users.find((candidate) => candidate.email === normalizeEmail(email))
    if (user?.password !== password) {
      throw new HttpFailure(401, {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      })
    }
    this.sessions.organizerId = user.id
    this.changed()
    return user
  }

  signUp(input: { name: string; email: string; password: string }) {
    const email = normalizeEmail(input.email)
    if (this.data.users.some((user) => user.email === email)) {
      throw new HttpFailure(422, {
        code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
        message: "User already exists. Use another email.",
      })
    }
    const user: MockUser = {
      id: this.newId(),
      name: input.name.trim(),
      email,
      password: input.password,
    }
    this.data.users.push(user)
    // BetterAuth signs the new account in.
    this.sessions.organizerId = user.id
    this.changed()
    return user
  }

  signOut() {
    this.sessions.organizerId = null
    this.changed()
  }

  // ---- Organizations ----

  private organizer() {
    const user = this.signedInOrganizer
    if (!user) throw unauthorized()
    return user
  }

  /** A foreign organization looks the same as a missing one (S2-03). */
  private ownOrganization(organizationId: string) {
    const owner = this.organizer()
    const organization = this.data.organizations.find(
      (candidate) => candidate.id === organizationId && candidate.ownerId === owner.id,
    )
    if (!organization) throw notAvailable()
    return organization
  }

  listOrganizations(): Organization[] {
    const owner = this.organizer()
    return this.data.organizations
      .filter((organization) => organization.ownerId === owner.id)
      .sort((a, b) => a.name.localeCompare(b.name, "cs"))
      .map(({ id, name }) => ({ id, name }))
  }

  getOrganization(organizationId: string): Organization {
    const { id, name } = this.ownOrganization(organizationId)
    return { id, name }
  }

  createOrganization(input: { name: string }): Organization {
    const owner = this.organizer()
    const name = input.name.trim()
    const isTaken = this.data.organizations.some(
      (organization) => organization.ownerId === owner.id && organization.name === name,
    )
    if (isTaken) {
      throw conflict({ message: "Organizace s tímto názvem už existuje.", error: "Conflict" })
    }
    const organization = { id: this.newId(), ownerId: owner.id, name }
    this.data.organizations.push(organization)
    this.changed()
    return { id: organization.id, name }
  }

  // ---- Events and terms ----

  private ownEvent(organizationId: string, eventId: string) {
    this.ownOrganization(organizationId)
    const event = this.data.events.find(
      (candidate) => candidate.id === eventId && candidate.organizationId === organizationId,
    )
    if (!event) throw notAvailable()
    return event
  }

  /** Writes to the basics and terms are refused from the first opening on (R3). */
  private unlockedEvent(organizationId: string, eventId: string) {
    const event = this.ownEvent(organizationId, eventId)
    if (event.isLocked) throw locked()
    return event
  }

  listEvents(organizationId: string): EventSummary[] {
    this.ownOrganization(organizationId)
    return this.data.events
      .filter((event) => event.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((event) => this.eventSummary(event))
  }

  getEvent(organizationId: string, eventId: string): EventDetail {
    return this.eventDetail(this.ownEvent(organizationId, eventId))
  }

  createEvent(organizationId: string, input: EventInput): EventDetail {
    this.ownOrganization(organizationId)
    const event: MockEvent = {
      id: this.newId(),
      organizationId,
      publicId: `ak${String(this.sequence).padStart(6, "0")}`,
      ...trimEvent(input),
      status: "draft",
      isLocked: false,
      createdAt: new Date().toISOString(),
      terms: [],
      rooms: [],
      paymentSettings: null,
    }
    this.data.events.push(event)
    this.changed()
    return this.eventDetail(event)
  }

  updateEvent(organizationId: string, eventId: string, input: EventInput): EventDetail {
    const event = this.unlockedEvent(organizationId, eventId)
    Object.assign(event, trimEvent(input))
    this.changed()
    return this.eventDetail(event)
  }

  saveTerm(
    organizationId: string,
    eventId: string,
    termId: string | null,
    input: TermInput,
  ): EventDetail {
    const event = this.unlockedEvent(organizationId, eventId)
    if (input.endDate < input.startDate) {
      throw badRequest({
        code: "term_dates",
        field: "endDate",
        message: "Konec nesmí být před začátkem.",
      })
    }
    const clash = event.terms.find((other) => other.id !== termId && rangesOverlap(other, input))
    if (clash) {
      throw conflict({
        code: "term_overlap",
        field: "startDate",
        message: `Překrývá se s termínem „${clash.label}“.`,
      })
    }
    const term = { ...input, label: input.label.trim() }
    if (termId) {
      const existing = event.terms.find((candidate) => candidate.id === termId)
      if (!existing) throw notAvailable()
      Object.assign(existing, term)
    } else {
      event.terms.push({ id: this.newId(), ...term })
    }
    this.changed()
    return this.eventDetail(event)
  }

  deleteTerm(organizationId: string, eventId: string, termId: string): EventDetail {
    const event = this.unlockedEvent(organizationId, eventId)
    if (!event.terms.some((term) => term.id === termId)) throw notAvailable()
    event.terms = event.terms.filter((term) => term.id !== termId)
    for (const room of event.rooms) room.termIds = room.termIds.filter((id) => id !== termId)
    this.changed()
    return this.eventDetail(event)
  }

  /** Stays editable after opening; received registrations keep their copy (S2-09). */
  updatePaymentSettings(
    organizationId: string,
    eventId: string,
    input: PaymentSettings,
  ): EventDetail {
    const event = this.ownEvent(organizationId, eventId)
    // An empty prefix is no prefix.
    const prefix = input.bankAccountPrefix === "" ? null : input.bankAccountPrefix
    const settings = { ...input, bankAccountPrefix: prefix }
    const invalid = findInvalidAccountField(settings.bankAccountPrefix, settings.bankAccountNumber)
    if (invalid) {
      throw badRequest({
        code: "bank_account_invalid",
        field: invalid,
        message:
          invalid === "bankAccountPrefix"
            ? "Předčíslí není platné, zkontrolujte ho."
            : "Číslo účtu není platné, zkontrolujte ho.",
      })
    }
    event.paymentSettings = settings
    this.changed()
    return this.eventDetail(event)
  }

  /** Draft → open, one way; opening an open event again is a no-op (S2-06). */
  openRegistration(organizationId: string, eventId: string): EventDetail {
    const event = this.ownEvent(organizationId, eventId)
    if (event.status === "open") return this.eventDetail(event)
    if (event.status !== "draft") {
      throw conflict({ code: "event_not_draft", message: "Přihlašování nelze znovu otevřít." })
    }
    const blockers = this.eventDetail(event).openingBlockers
    if (blockers.length > 0) {
      throw conflict({
        code: "opening_conditions_not_met",
        blockers,
        message: "Přihlašování nelze otevřít, doplňte chybějící údaje.",
      })
    }
    event.status = "open"
    event.isLocked = true
    this.changed()
    return this.eventDetail(event)
  }

  // ---- Rooms and occupancy ----

  getRooms(organizationId: string, eventId: string): RoomsOverview {
    return this.roomsOverview(this.ownEvent(organizationId, eventId))
  }

  saveRoom(
    organizationId: string,
    eventId: string,
    roomId: string | null,
    input: RoomInput,
  ): RoomsOverview {
    const event = this.ownEvent(organizationId, eventId)
    const room = { label: input.label.trim(), bedCount: input.bedCount, termIds: input.termIds }
    return this.writeRooms(event, input.termIds, (rooms) => {
      if (!roomId) return [...rooms, { id: this.newId(), ...room }]
      if (!rooms.some((candidate) => candidate.id === roomId)) return null
      return rooms.map((candidate) =>
        candidate.id === roomId ? { ...candidate, ...room } : candidate,
      )
    })
  }

  deleteRoom(organizationId: string, eventId: string, roomId: string): RoomsOverview {
    const event = this.ownEvent(organizationId, eventId)
    return this.writeRooms(event, [], (rooms) =>
      rooms.some((room) => room.id === roomId) ? rooms.filter((room) => room.id !== roomId) : null,
    )
  }

  /**
   * Rooms stay editable after opening (S2-05), but no change may take a
   * term's capacity below its confirmed participants.
   */
  private writeRooms(
    event: MockEvent,
    termIds: string[],
    change: (rooms: MockRoom[]) => MockRoom[] | null,
  ): RoomsOverview {
    if (termIds.some((termId) => !event.terms.some((term) => term.id === termId))) {
      throw badRequest({
        code: "term_unknown",
        field: "termIds",
        message: "Dostupnost lze vybrat jen z termínů této akce.",
      })
    }
    const rooms = change(event.rooms)
    if (!rooms) throw notAvailable()
    const labels = rooms.map((room) => room.label)
    if (new Set(labels).size !== labels.length) {
      throw conflict({
        code: "room_label_taken",
        field: "label",
        message: "Pokoj s tímto označením už v akci existuje.",
      })
    }
    const shortfall = this.occupancy({ ...event, rooms }).find(
      (term) => term.capacity < term.confirmed,
    )
    if (shortfall) {
      throw conflict({
        code: "capacity_below_confirmed",
        termId: shortfall.id,
        message:
          `Termín „${shortfall.label}“: kapacita by klesla na ${shortfall.capacity}, ` +
          `ale má ${shortfall.confirmed} potvrzených účastníků. ` +
          "Kapacita nesmí klesnout pod potvrzenou účast.",
      })
    }
    event.rooms = rooms
    this.changed()
    return this.roomsOverview(event)
  }

  // ---- Registrations (organizer) ----

  private ownRegistration(organizationId: string, eventId: string, registrationId: string) {
    this.ownEvent(organizationId, eventId)
    const registration = this.data.registrations.find(
      (candidate) => candidate.id === registrationId && candidate.eventId === eventId,
    )
    if (!registration) throw notAvailable()
    return registration
  }

  /** Term and status match on the same term (§3.10); oldest first. */
  listRegistrations(
    organizationId: string,
    eventId: string,
    filter: RegistrationFilter,
  ): RegistrationList {
    this.ownEvent(organizationId, eventId)
    const all = this.data.registrations.filter((registration) => registration.eventId === eventId)
    const registrations = all
      .filter(
        (registration) =>
          !(filter.termId ?? filter.status) ||
          registration.terms.some(
            (term) =>
              (!filter.termId || term.termId === filter.termId) &&
              (!filter.status || term.status === filter.status),
          ),
      )
      .map((registration) => this.managedSummary(registration))
      .filter((summary) => !filter.payment || summary.paymentState === filter.payment)
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    return { total: all.length, registrations }
  }

  getRegistration(
    organizationId: string,
    eventId: string,
    registrationId: string,
  ): RegistrationDetail {
    return this.managedDetail(this.ownRegistration(organizationId, eventId, registrationId))
  }

  /** A retry with the same key and content records nothing new (S2-12). */
  recordPayment(
    organizationId: string,
    eventId: string,
    registrationId: string,
    input: { submissionKey: string; amountMinor: number; receivedOn: string },
  ): RegistrationDetail {
    const registration = this.ownRegistration(organizationId, eventId, registrationId)
    const repeat = registration.payments.find(
      (payment) => payment.submissionKey === input.submissionKey,
    )
    if (repeat) {
      if (repeat.amountMinor !== input.amountMinor || repeat.receivedOn !== input.receivedOn) {
        throw conflict({
          code: "submission_key_reused",
          message: "Tato platba už byla odeslána s jinými údaji.",
        })
      }
      return this.managedDetail(registration)
    }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 1) {
      throw badRequest({ message: "Částka musí být větší než nula." })
    }
    if (input.amountMinor > MAX_PAYMENT_MINOR) {
      throw badRequest({ message: "Částka může být nejvýše 10 000 000 Kč." })
    }
    if (input.receivedOn > todayInPrague()) {
      throw badRequest({
        code: "received_on_future",
        field: "receivedOn",
        message: "Datum přijetí nesmí být v budoucnosti.",
      })
    }
    registration.payments.push({ id: this.newId(), ...input })
    this.changed()
    return this.managedDetail(registration)
  }

  // ---- Public link and registration form ----

  getPublicEvent(publicId: string): PublicEvent {
    const event = this.data.events.find(
      (candidate) => candidate.publicId === publicId && candidate.status === "open",
    )
    if (!event) throw notAvailable()
    return {
      name: event.name,
      description: event.description,
      location: event.location,
      terms: [...event.terms]
        .sort(byStart)
        .map(({ id, label, startDate, endDate, priceMinor }) => ({
          id,
          label,
          startDate,
          endDate,
          priceMinor,
        })),
    }
  }

  /**
   * Each term decides on its own: a free bed confirms, otherwise the
   * participant waits (S2-08). A repeat of a saved submission (same key and
   * content) returns the stored result.
   */
  submitRegistration(
    publicId: string,
    input: RegistrationInput,
  ): { isCreated: boolean; result: RegistrationResult } {
    const stored = this.data.registrations.find(
      (registration) => registration.submissionKey === input.submissionKey,
    )
    if (stored) {
      if (this.eventOf(stored).publicId !== publicId || !isSameSubmission(stored, input)) {
        throw conflict({
          code: "submission_key_reused",
          message: "Tato přihláška už byla odeslána s jinými údaji. Načtěte formulář znovu.",
        })
      }
      return { isCreated: false, result: this.registrationResult(stored) }
    }

    const event = this.data.events.find(
      (candidate) => candidate.publicId === publicId && candidate.status === "open",
    )
    if (!event) {
      throw new HttpFailure(404, {
        statusCode: 404,
        code: "event_unavailable",
        message: "Přihlašování na tuto akci není dostupné.",
      })
    }
    const termIds = [...new Set(input.termIds)]
    if (termIds.length === 0 || termIds.some((id) => !event.terms.some((term) => term.id === id))) {
      throw badRequest({
        code: "term_unknown",
        field: "termIds",
        message: "Vyberte termíny této akce.",
      })
    }
    const email = normalizeEmail(input.email)
    const isRegistered = this.data.registrations.some(
      (registration) =>
        registration.eventId === event.id && normalizeEmail(registration.email) === email,
    )
    if (isRegistered) {
      throw conflict({
        code: "already_registered",
        field: "email",
        message: "Přihláška s tímto e-mailem na tuto akci již existuje.",
      })
    }

    const occupancy = this.occupancy(event)
    const terms = event.terms
      .filter((term) => termIds.includes(term.id))
      .sort(byStart)
      .map((term) => ({
        termId: term.id,
        status: decideParticipation(occupancy.find((candidate) => candidate.id === term.id)!),
      }))
    const receivedAt = new Date().toISOString()
    const due = amountDueMinor(
      terms.map((term) => ({
        status: term.status,
        priceMinor: this.termOf(event, term.termId).priceMinor,
      })),
    )
    // An open event always has payment settings (opening precondition).
    const settings = event.paymentSettings!
    const registration: MockRegistration = {
      id: this.newId(),
      eventId: event.id,
      submissionKey: input.submissionKey,
      receivedAt,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      phone: input.phone,
      terms,
      variableSymbol: String(this.nextVariableSymbol++),
      account: {
        prefix: settings.bankAccountPrefix,
        number: settings.bankAccountNumber,
        bankCode: settings.bankCode,
      },
      reminderAt: due > 0 ? paymentReminderAt(receivedAt, settings.paymentReminderDays) : null,
      payments: [],
    }
    this.data.registrations.push(registration)
    this.changed()
    return { isCreated: true, result: this.registrationResult(registration) }
  }

  // ---- Participant access (magic link) ----

  /** The same answer for every e-mail; only one with registrations gets a link (S2-13). */
  requestMagicLink(rawEmail: string) {
    const email = normalizeEmail(rawEmail)
    const hasRegistrations = this.data.registrations.some(
      (registration) => normalizeEmail(registration.email) === email,
    )
    if (hasRegistrations) {
      const token = crypto.randomUUID()
      this.magicLinks.push({
        token,
        email,
        expiresAt: Date.now() + MAGIC_LINK_LIFETIME_MS,
        isUsed: false,
      })
      this.sent.unshift({
        id: this.newId(),
        to: email,
        subject: "Přihlašovací odkaz do akc.io",
        sentAt: new Date().toISOString(),
        text: "Klikněte na tlačítko a uvidíte své přihlášky. Odkaz platí 15 minut a jde použít jen jednou.",
        action: {
          label: "Zobrazit moje přihlášky",
          path: `/my-registrations/verify?token=${token}`,
        },
      })
      this.changed()
    }
    return { message: LINK_REQUESTED_MESSAGE }
  }

  openParticipantSession(token: string) {
    const link = this.magicLinks.find((candidate) => candidate.token === token)
    if (!link || link.isUsed || link.expiresAt < Date.now()) {
      throw new HttpFailure(401, {
        statusCode: 401,
        code: "magic_link_invalid",
        message: "Odkaz už není platný. Vyžádejte si nový přihlašovací odkaz.",
      })
    }
    link.isUsed = true
    this.sessions.participantEmail = link.email
    this.changed()
  }

  private participant() {
    const email = this.sessions.participantEmail
    if (!email) {
      throw new HttpFailure(401, {
        statusCode: 401,
        code: "participant_session_required",
        message: "Přihlášení vypršelo.",
      })
    }
    return email
  }

  participantMe() {
    return { email: this.participant() }
  }

  participantLogout() {
    this.sessions.participantEmail = null
    this.changed()
  }

  /** Newest first. */
  participantRegistrations(): ParticipantRegistration[] {
    const email = this.participant()
    return this.data.registrations
      .filter((registration) => normalizeEmail(registration.email) === email)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .map((registration) => this.participantRegistration(registration))
  }

  /** Someone else's registration looks the same as a missing one. */
  getParticipantRegistration(registrationId: string): ParticipantRegistration {
    const email = this.participant()
    const registration = this.data.registrations.find(
      (candidate) => candidate.id === registrationId && normalizeEmail(candidate.email) === email,
    )
    if (!registration) throw notAvailable()
    return this.participantRegistration(registration)
  }

  // ---- Views: what the API derives from the stored records ----

  private eventOf(registration: MockRegistration) {
    return this.data.events.find((event) => event.id === registration.eventId)!
  }

  private termOf(event: MockEvent, termId: string) {
    return event.terms.find((term) => term.id === termId)!
  }

  /** Capacity is never stored: it is the sum of beds available in the term. */
  private occupancy(event: MockEvent): TermOccupancy[] {
    const termsOfEvent = this.data.registrations
      .filter((registration) => registration.eventId === event.id)
      .flatMap((registration) => registration.terms)
    return [...event.terms].sort(byStart).map((term) => {
      const capacity = event.rooms
        .filter((room) => room.termIds.includes(term.id))
        .reduce((sum, room) => sum + room.bedCount, 0)
      const count = (status: string) =>
        termsOfEvent.filter((entry) => entry.termId === term.id && entry.status === status).length
      const confirmed = count("confirmed")
      return {
        id: term.id,
        label: term.label,
        startDate: term.startDate,
        endDate: term.endDate,
        capacity,
        confirmed,
        free: Math.max(0, capacity - confirmed),
        waitlisted: count("waitlisted"),
      }
    })
  }

  private eventDetail(event: MockEvent): EventDetail {
    const occupancy = this.occupancy(event)
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      status: event.status,
      isLocked: event.isLocked,
      terms: [...event.terms].sort(byStart).map((term) => ({
        ...term,
        capacity: occupancy.find((entry) => entry.id === term.id)?.capacity ?? 0,
      })),
      paymentSettings: event.paymentSettings,
      publicId: event.publicId,
      openingBlockers: findOpeningBlockers({ ...event, termCount: event.terms.length }),
    }
  }

  private eventSummary(event: MockEvent): EventSummary {
    const terms = [...event.terms].sort(byStart)
    const ends = terms.map((term) => term.endDate).sort()
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      status: event.status,
      termCount: terms.length,
      period: terms.length > 0 ? { startDate: terms[0]!.startDate, endDate: ends.at(-1)! } : null,
    }
  }

  private roomsOverview(event: MockEvent): RoomsOverview {
    return {
      rooms: event.rooms.map((room) => ({ ...room, termIds: [...room.termIds] })),
      terms: this.occupancy(event),
    }
  }

  private registrationTerms(registration: MockRegistration) {
    const event = this.eventOf(registration)
    return registration.terms
      .map((entry) => {
        const term = this.termOf(event, entry.termId)
        return {
          termId: term.id,
          label: term.label,
          startDate: term.startDate,
          endDate: term.endDate,
          priceMinor: term.priceMinor,
          status: entry.status,
        }
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
  }

  private amounts(registration: MockRegistration) {
    const terms = this.registrationTerms(registration)
    const due = amountDueMinor(terms)
    const paid = registration.payments.reduce((sum, payment) => sum + payment.amountMinor, 0)
    return {
      terms,
      selectedPriceMinor: terms.reduce((sum, term) => sum + term.priceMinor, 0),
      amountDueMinor: due,
      paidMinor: paid,
      balanceMinor: due - paid,
      paymentState: paymentState(due, paid),
    }
  }

  private payments(registration: MockRegistration) {
    return [...registration.payments]
      .sort((a, b) => a.receivedOn.localeCompare(b.receivedOn))
      .map(({ id, receivedOn, amountMinor }) => ({ id, receivedOn, amountMinor }))
  }

  private managedSummary(registration: MockRegistration): RegistrationSummary {
    const {
      terms,
      amountDueMinor: due,
      paidMinor,
      balanceMinor,
      paymentState: state,
    } = this.amounts(registration)
    return {
      id: registration.id,
      receivedAt: registration.receivedAt,
      firstName: registration.firstName,
      lastName: registration.lastName,
      email: registration.email,
      phone: registration.phone,
      terms,
      amountDueMinor: due,
      paidMinor,
      balanceMinor,
      paymentState: state,
    }
  }

  private managedDetail(registration: MockRegistration): RegistrationDetail {
    const amounts = this.amounts(registration)
    return {
      ...this.managedSummary(registration),
      selectedPriceMinor: amounts.selectedPriceMinor,
      reminderAt: amounts.amountDueMinor > 0 ? registration.reminderAt : null,
      variableSymbol: registration.variableSymbol,
      payments: this.payments(registration),
    }
  }

  private instructions(registration: MockRegistration, amountMinor: number) {
    if (amountMinor <= 0 || !registration.reminderAt) return null
    return {
      amountMinor,
      variableSymbol: registration.variableSymbol,
      account: registration.account,
      reminderAt: registration.reminderAt,
    }
  }

  private registrationResult(registration: MockRegistration): RegistrationResult {
    const { terms, selectedPriceMinor, amountDueMinor: due } = this.amounts(registration)
    const event = this.eventOf(registration)
    return {
      id: registration.id,
      receivedAt: registration.receivedAt,
      event: { name: event.name, location: event.location },
      firstName: registration.firstName,
      lastName: registration.lastName,
      email: registration.email,
      phone: registration.phone,
      terms,
      selectedPriceMinor,
      amountDueMinor: due,
      paymentInstructions: this.instructions(registration, due),
    }
  }

  /** Instructions only while a debt remains, for what is still owed. */
  private participantRegistration(registration: MockRegistration): ParticipantRegistration {
    const amounts = this.amounts(registration)
    const event = this.eventOf(registration)
    return {
      id: registration.id,
      receivedAt: registration.receivedAt,
      event: { name: event.name, location: event.location },
      terms: amounts.terms,
      selectedPriceMinor: amounts.selectedPriceMinor,
      amountDueMinor: amounts.amountDueMinor,
      paidMinor: amounts.paidMinor,
      balanceMinor: amounts.balanceMinor,
      paymentInstructions: this.instructions(registration, amounts.balanceMinor),
      payments: this.payments(registration),
    }
  }
}

const trimEvent = (input: EventInput): EventInput => ({
  name: input.name.trim(),
  description: input.description.trim(),
  location: input.location.trim(),
})

/** Term order and e-mail case do not change what was submitted. */
function isSameSubmission(stored: MockRegistration, input: RegistrationInput) {
  const terms = (ids: string[]) => [...ids].sort().join()
  return (
    stored.firstName === input.firstName.trim() &&
    stored.lastName === input.lastName.trim() &&
    normalizeEmail(stored.email) === normalizeEmail(input.email) &&
    stored.phone === input.phone &&
    terms(stored.terms.map((term) => term.termId)) === terms(input.termIds)
  )
}

/** The one backend all previews talk to; each story loads its own data. */
export const mockBackend = new MockBackend()
