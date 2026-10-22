import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventTerm,
  ParticipationStatus,
  Registration,
} from '@/generated/prisma/client';
import { EventRegistrationsController } from '@/modules/registrations/controllers/event-registrations.controller';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { EventRegistrationsService } from '@/modules/registrations/services/event-registrations.service';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// S2-11 through the HTTP API against a real database: the list of one event's
// registrations, its combined filters, the detail with payments and balance,
// and access (S2-03). Payments are written directly, as S2-12 will store them.
// Only the BetterAuth session is replaced: the `x-test-user` header names the
// caller. Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

// The real guard pulls in BetterAuth, which is ESM-only and cannot load under
// Jest's CommonJS runtime, so the whole guard module is replaced (jest.mock is
// hoisted above the imports).
jest.mock('@/shared/auth/guards/authenticated-user.guard', () => ({
  AuthenticatedUserGuard: class {
    canActivate(context: {
      switchToHttp: () => {
        getRequest: () => {
          headers: Record<string, unknown>;
          session?: { user: { id: string } };
        };
      };
    }): boolean {
      const request = context.switchToHttp().getRequest();
      const id = request.headers['x-test-user'];
      if (typeof id !== 'string') return false;
      request.session = { user: { id } };
      return true;
    }
  },
}));

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [EventRegistrationsController],
    providers: [EventRegistrationsService, EventRegistrationsRepository],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

// Response bodies are asserted field by field; typing every DTO here adds nothing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

const get = async (userId: string | null, path: string): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    headers: userId ? { 'x-test-user': userId } : {},
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const UNAVAILABLE = {
  statusCode: 404,
  message: 'Záznam není dostupný',
  error: 'Not Found',
};

type Fixture = CreatedEvent & {
  ownerId: string;
  organizationId: string;
  path: string;
  /** Registers with a status per term (by index), received `minutesAgo` before now. */
  register: (
    statuses: Record<number, ParticipationStatus>,
    options?: { minutesAgo?: number; firstName?: string },
  ) => Promise<Registration>;
  pay: (
    registration: Registration,
    amountMinor: number,
    on?: string,
  ) => Promise<void>;
};

const T1 = {
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  label: 'T1',
  priceMinor: 790_000,
};
const T2 = {
  startDate: '2027-07-15',
  endDate: '2027-07-21',
  label: 'T2',
  priceMinor: 390_000,
};
const FREE = {
  startDate: '2027-08-01',
  endDate: '2027-08-02',
  label: 'Zdarma',
  priceMinor: 0,
};

const eventWith = async (organizationId?: string): Promise<Fixture> => {
  const organization = organizationId
    ? await prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
      })
    : await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [T1, T2, FREE],
  });
  const term = (index: number): EventTerm => created.terms[index];
  return {
    ...created,
    ownerId: organization.ownerId,
    organizationId: organization.id,
    path: `organizations/${organization.id}/events/${created.event.id}/registrations`,
    register: async (statuses, options = {}): Promise<Registration> => {
      const registration = await createRegistration(prisma, {
        event: created.event,
        terms: Object.entries(statuses).map(([index, status]) => ({
          term: term(Number(index)),
          status,
        })),
      });
      return prisma.registration.update({
        where: { id: registration.id },
        data: {
          receivedAt: new Date(Date.now() - (options.minutesAgo ?? 0) * 60_000),
          ...(options.firstName ? { firstName: options.firstName } : {}),
        },
      });
    },
    pay: async (registration, amountMinor, on): Promise<void> => {
      await createPayment(prisma, {
        registration,
        recordedById: organization.ownerId,
        amountMinor,
        receivedOn: on,
      });
    },
  };
};

const names = (body: { registrations: { firstName: string }[] }): string[] =>
  body.registrations.map((registration) => registration.firstName);

describe('the list of one event', () => {
  it('shows only its registrations, oldest first, with contacts and each term status', async () => {
    const f = await eventWith();
    const other = await eventWith(f.organizationId);
    await f.register({ 0: 'confirmed' }, { minutesAgo: 1, firstName: 'Druhá' });
    await f.register(
      { 0: 'confirmed', 1: 'waitlisted' },
      { minutesAgo: 5, firstName: 'První' },
    );
    await other.register({ 0: 'confirmed' }, { firstName: 'Cizí' });

    const list = await get(f.ownerId, f.path);
    expect(list.status).toBe(200);
    expect(names(list.body)).toEqual(['První', 'Druhá']);
    expect(list.body.total).toBe(2);
    expect(list.body.registrations[0]).toMatchObject({
      lastName: expect.any(String),
      email: expect.stringContaining('@example.test'),
      phone: '+420600000000',
      receivedAt: expect.any(String),
      terms: [
        { label: 'T1', status: 'confirmed', startDate: '2027-07-01' },
        { label: 'T2', status: 'waitlisted', startDate: '2027-07-15' },
      ],
    });
  });

  it('is an empty list for an event without registrations', async () => {
    const f = await eventWith();
    expect(await get(f.ownerId, f.path)).toEqual({
      status: 200,
      body: { total: 0, registrations: [] },
    });
  });
});

describe('filters', () => {
  /** Mixed: T1 confirmed, T2 waitlisted. Waiting: T2 waitlisted. Confirmed: T1 and T2. */
  const setup = async (): Promise<
    Fixture & { query: (q: string) => Promise<string[]> }
  > => {
    const f = await eventWith();
    await f.register(
      { 0: 'confirmed', 1: 'waitlisted' },
      { minutesAgo: 3, firstName: 'Smíšená' },
    );
    await f.register(
      { 1: 'waitlisted' },
      { minutesAgo: 2, firstName: 'Čekající' },
    );
    await f.register(
      { 0: 'confirmed', 1: 'confirmed' },
      { minutesAgo: 1, firstName: 'Potvrzená' },
    );
    return {
      ...f,
      query: async (q): Promise<string[]> => {
        const response = await get(f.ownerId, `${f.path}?${q}`);
        expect(response.status).toBe(200);
        return names(response.body);
      },
    };
  };

  it('matches term and status on the same term', async () => {
    const f = await setup();
    const [t1, t2] = [f.terms[0].id, f.terms[1].id];
    // T1 confirmed + T2 waitlisted is not in T1 + Náhradník, but is in T2 + Náhradník.
    expect(await f.query(`termId=${t1}&status=waitlisted`)).toEqual([]);
    expect(await f.query(`termId=${t2}&status=waitlisted`)).toEqual([
      'Smíšená',
      'Čekající',
    ]);
    expect(await f.query(`termId=${t1}&status=confirmed`)).toEqual([
      'Smíšená',
      'Potvrzená',
    ]);
  });

  it('matches a status in any term without a term filter, listing each registration once', async () => {
    const f = await setup();
    expect(await f.query('status=waitlisted')).toEqual(['Smíšená', 'Čekající']);
    // Potvrzená is confirmed in both terms and still listed once.
    expect(await f.query('status=confirmed')).toEqual(['Smíšená', 'Potvrzená']);
    expect(await f.query(`termId=${f.terms[0].id}`)).toEqual([
      'Smíšená',
      'Potvrzená',
    ]);
  });

  it('tells all five payment states apart and combines them with the others', async () => {
    const f = await eventWith();
    await f.register({ 1: 'waitlisted' }, { minutesAgo: 6, firstName: 'Bez' });
    await f.register(
      { 0: 'confirmed' },
      { minutesAgo: 5, firstName: 'Nezaplacená' },
    );
    const partial = await f.register(
      { 0: 'confirmed' },
      { minutesAgo: 4, firstName: 'Částečná' },
    );
    const paid = await f.register(
      { 0: 'confirmed', 1: 'waitlisted' },
      { minutesAgo: 3, firstName: 'Zaplacená' },
    );
    const over = await f.register(
      { 0: 'confirmed' },
      { minutesAgo: 2, firstName: 'Přeplacená' },
    );
    const freeButPaid = await f.register(
      { 2: 'confirmed' },
      { minutesAgo: 1, firstName: 'Zdarma' },
    );
    await f.pay(partial, 190_000);
    await f.pay(paid, 400_000);
    await f.pay(paid, 390_000);
    await f.pay(over, 800_000);
    await f.pay(freeButPaid, 100);

    const by = async (payment: string, extra = ''): Promise<string[]> =>
      names(
        (await get(f.ownerId, `${f.path}?payment=${payment}${extra}`)).body,
      );
    expect(await by('none')).toEqual(['Bez']);
    expect(await by('unpaid')).toEqual(['Nezaplacená']);
    expect(await by('partial')).toEqual(['Částečná']);
    expect(await by('paid')).toEqual(['Zaplacená']);
    // A payment with nothing due is an overpayment.
    expect(await by('overpaid')).toEqual(['Přeplacená', 'Zdarma']);
    expect(await by('paid', '&status=waitlisted')).toEqual(['Zaplacená']);
    expect(await by('unpaid', `&termId=${f.terms[1].id}`)).toEqual([]);

    const all = (await get(f.ownerId, f.path)).body.registrations;
    expect(
      all.find((r: { firstName: string }) => r.firstName === 'Částečná'),
    ).toMatchObject({
      amountDueMinor: 790_000,
      paidMinor: 190_000,
      balanceMinor: 600_000,
      paymentState: 'partial',
    });
  });

  it('refuses an unknown filter value and matches nothing for a term of another event', async () => {
    const f = await setup();
    const other = await eventWith(f.organizationId);
    for (const q of [
      'status=cancelled',
      'payment=late',
      'termId=abc',
      'sort=desc',
    ]) {
      expect((await get(f.ownerId, `${f.path}?${q}`)).status).toBe(400);
    }
    expect(await f.query(`termId=${other.terms[0].id}`)).toEqual([]);
  });
});

describe('the detail', () => {
  it('shows the terms, amounts, reminder date, VS, payments and balance', async () => {
    const f = await eventWith();
    const registration = await f.register({ 0: 'confirmed', 1: 'waitlisted' });
    const reminderAt = new Date('2027-06-28T08:00:00.000Z');
    await prisma.registration.update({
      where: { id: registration.id },
      data: { paymentReminderAt: reminderAt },
    });
    await f.pay(registration, 100_000, '2026-10-14');
    await f.pay(registration, 90_000, '2026-10-12');

    const detail = await get(f.ownerId, `${f.path}/${registration.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: registration.id,
      firstName: registration.firstName,
      email: registration.email,
      phone: registration.phone,
      terms: [
        {
          label: 'T1',
          priceMinor: 790_000,
          status: 'confirmed',
          endDate: '2027-07-07',
        },
        { label: 'T2', priceMinor: 390_000, status: 'waitlisted' },
      ],
      selectedPriceMinor: 1_180_000,
      amountDueMinor: 790_000,
      paidMinor: 190_000,
      balanceMinor: 600_000,
      paymentState: 'partial',
      reminderAt: reminderAt.toISOString(),
      variableSymbol: registration.variableSymbol,
      payments: [
        { receivedOn: '2026-10-12', amountMinor: 90_000 },
        { receivedOn: '2026-10-14', amountMinor: 100_000 },
      ],
    });
  });

  it('has no reminder date or VS without an obligation, and shows a later payment', async () => {
    const f = await eventWith();
    const registration = await f.register({ 1: 'waitlisted' });
    const path = `${f.path}/${registration.id}`;

    const before = await get(f.ownerId, path);
    expect(before.body).toMatchObject({
      amountDueMinor: 0,
      paymentState: 'none',
      reminderAt: null,
      variableSymbol: null,
      payments: [],
    });

    // What a payment recorded through S2-12 changes on the next read.
    await f.pay(registration, 5_000);
    const after = await get(f.ownerId, path);
    expect(after.body).toMatchObject({
      paidMinor: 5_000,
      balanceMinor: -5_000,
      paymentState: 'overpaid',
      payments: [{ amountMinor: 5_000 }],
    });
    const listed = await get(f.ownerId, `${f.path}?payment=overpaid`);
    expect(listed.body.registrations.map((r: { id: string }) => r.id)).toEqual([
      registration.id,
    ]);
    expect(listed.body.total).toBe(1);
  });
});

describe('access', () => {
  it('answers a foreign event or registration like a missing one', async () => {
    const mine = await eventWith();
    const sibling = await eventWith(mine.organizationId);
    const foreign = await eventWith();
    const own = await mine.register({ 0: 'confirmed' });
    const ofSibling = await sibling.register({ 0: 'confirmed' });
    const ofForeign = await foreign.register({ 0: 'confirmed' });
    const crossed = `organizations/${mine.organizationId}/events/${foreign.event.id}/registrations`;

    for (const path of [
      foreign.path,
      `${foreign.path}/${ofForeign.id}`,
      crossed,
      `${crossed}/${ofForeign.id}`,
      // A registration of another own event, or of a foreign one, through this event.
      `${mine.path}/${ofSibling.id}`,
      `${mine.path}/${ofForeign.id}`,
      `${mine.path}/${randomUUID()}`,
      `organizations/${randomUUID()}/events/${randomUUID()}/registrations`,
    ]) {
      expect({ path, ...(await get(mine.ownerId, path)) }).toEqual({
        path,
        status: 404,
        body: UNAVAILABLE,
      });
    }

    // Each stays reachable through its own event.
    expect(
      (await get(mine.ownerId, `${sibling.path}/${ofSibling.id}`)).status,
    ).toBe(200);
    expect((await get(mine.ownerId, `${mine.path}/${own.id}`)).status).toBe(
      200,
    );
  });

  it('requires a session', async () => {
    const f = await eventWith();
    const registration = await f.register({ 0: 'confirmed' });
    expect((await get(null, f.path)).status).toBe(403);
    expect((await get(null, `${f.path}/${registration.id}`)).status).toBe(403);
  });
});
