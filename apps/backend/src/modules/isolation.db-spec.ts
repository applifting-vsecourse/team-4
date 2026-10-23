import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { EventPaymentSettingsController } from '@/modules/events/controllers/event-payment-settings.controller';
import { EventTermsController } from '@/modules/events/controllers/event-terms.controller';
import { EventsController } from '@/modules/events/controllers/events.controller';
import { EventsRepository } from '@/modules/events/repositories/events.repository';
import { EventsService } from '@/modules/events/services/events.service';
import { OrganizationsController } from '@/modules/organizations/controllers/organizations.controller';
import { OrganizationsRepository } from '@/modules/organizations/repositories/organizations.repository';
import { OrganizationsService } from '@/modules/organizations/services/organizations.service';
import { RoomsController } from '@/modules/rooms/controllers/rooms.controller';
import { RoomsRepository } from '@/modules/rooms/repositories/rooms.repository';
import { RoomsService } from '@/modules/rooms/services/rooms.service';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// S2-03 across every organizer operation Sprint 2 provides, through the HTTP
// API against a real database: organizations, events, terms, payment settings,
// opening registration and rooms. Organizer A owns A1 (two events), A2 (one)
// and A3 (none); organizer B owns B1. Refused calls are checked against the
// stored rows too, not only the status. Registrations and payments have no
// organizer API yet (S2-11, S2-12), so they are only checked to stay unchanged.
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
    controllers: [
      OrganizationsController,
      EventsController,
      EventTermsController,
      EventPaymentSettingsController,
      RoomsController,
    ],
    providers: [
      OrganizationsService,
      OrganizationsRepository,
      EventsService,
      EventsRepository,
      RoomsService,
      RoomsRepository,
    ],
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

const call = async (
  userId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-test-user': userId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

/** What a foreign and a missing record both answer, with nothing of the record. */
const UNAVAILABLE = {
  statusCode: 404,
  message: 'Záznam není dostupný',
  error: 'Not Found',
};

const BASICS = {
  name: 'Podvržená akce',
  description: 'Nesmí vzniknout',
  location: 'Nikde',
};
const TERM = {
  label: 'Podvržený termín',
  startDate: '2028-08-01',
  endDate: '2028-08-07',
  priceMinor: 100,
};
const ACCOUNT = {
  bankAccountPrefix: '19',
  bankAccountNumber: '2000145399',
  bankCode: '0800',
  paymentReminderDays: 7,
};
const room = (termIds: string[]): object => ({
  label: 'Podvržený pokoj',
  bedCount: 9,
  termIds,
});

/** A draft event, so every write is allowed to its owner. */
type EventRecord = { id: string; termId: string; roomId: string };

type World = {
  a: string;
  b: string;
  A1: string;
  A2: string;
  A3: string;
  B1: string;
  E1: EventRecord;
  E2: EventRecord;
  E3: EventRecord;
  F1: EventRecord;
};

const eventIn = async (
  organizationId: string,
  label: string,
): Promise<EventRecord> => {
  const created = await createEvent(prisma, {
    organizationId,
    status: 'draft',
    terms: [{ startDate: '2027-07-01', endDate: '2027-07-07', label }],
    rooms: [{ bedCount: 2, termIndexes: [0], label: `Pokoj ${label}` }],
  });
  // A participant, so registrations are part of what must stay unchanged.
  await createRegistration(prisma, {
    event: created.event,
    terms: [{ term: created.terms[0], status: 'confirmed' }],
  });
  return {
    id: created.event.id,
    termId: created.terms[0].id,
    roomId: created.rooms[0].id,
  };
};

const world = async (): Promise<World> => {
  const [a, b] = [await createOrganizer(prisma), await createOrganizer(prisma)];
  const [A1, A2, A3, B1] = [
    await createOrganization(prisma, { ownerId: a.id }),
    await createOrganization(prisma, { ownerId: a.id }),
    await createOrganization(prisma, { ownerId: a.id }),
    await createOrganization(prisma, { ownerId: b.id }),
  ];
  return {
    a: a.id,
    b: b.id,
    A1: A1.id,
    A2: A2.id,
    A3: A3.id,
    B1: B1.id,
    E1: await eventIn(A1.id, 'E1'),
    E2: await eventIn(A1.id, 'E2'),
    E3: await eventIn(A2.id, 'E3'),
    F1: await eventIn(B1.id, 'F1'),
  };
};

type Operation = [method: string, path: string, body?: unknown];

const organizationOperations = (organizationId: string): Operation[] => {
  const path = `organizations/${organizationId}`;
  return [
    ['GET', path],
    ['GET', `${path}/events`],
    ['POST', `${path}/events`, BASICS],
  ];
};

/** Every organizer operation of Sprint 2 on one event, through `organizationId`. */
const eventOperations = (
  organizationId: string,
  event: EventRecord,
): Operation[] => {
  const path = `organizations/${organizationId}/events/${event.id}`;
  return [
    ['GET', path],
    ['PUT', path, BASICS],
    ['POST', `${path}/open-registration`],
    ['PUT', `${path}/payment-settings`, ACCOUNT],
    ['POST', `${path}/terms`, TERM],
    ['PUT', `${path}/terms/${event.termId}`, TERM],
    ['DELETE', `${path}/terms/${event.termId}`],
    ['GET', `${path}/rooms`],
    ['POST', `${path}/rooms`, room([])],
    // No terms in the body: a swapped term there is refused before the room
    // is looked up (see 'identifiers swapped in the body').
    ['PUT', `${path}/rooms/${event.roomId}`, room([])],
    ['DELETE', `${path}/rooms/${event.roomId}`],
  ];
};

/** Everything stored for the organizations, to prove a refused call changed nothing. */
const snapshot = async (organizationIds: string[]): Promise<unknown> => {
  const scope = { organizationId: { in: organizationIds } };
  return {
    organizations: await prisma.organization.findMany({
      where: { id: { in: organizationIds } },
      orderBy: { id: 'asc' },
    }),
    events: await prisma.event.findMany({
      where: scope,
      orderBy: { id: 'asc' },
      include: {
        terms: { orderBy: { id: 'asc' } },
        rooms: {
          orderBy: { id: 'asc' },
          include: { availabilities: { orderBy: { termId: 'asc' } } },
        },
      },
    }),
    registrations: await prisma.registration.findMany({
      where: scope,
      orderBy: { id: 'asc' },
      include: { terms: { orderBy: { termId: 'asc' } }, payments: true },
    }),
  };
};

/** Runs each operation as `userId` and expects the shared 404 and no change at all. */
const expectAllUnavailable = async (
  w: World,
  userId: string,
  operations: Operation[],
): Promise<void> => {
  const before = await snapshot([w.A1, w.A2, w.A3, w.B1]);
  for (const [method, path, body] of operations) {
    const response = await call(userId, method, path, body);
    expect({ method, path, ...response }).toEqual({
      method,
      path,
      status: 404,
      body: UNAVAILABLE,
    });
  }
  expect(await snapshot([w.A1, w.A2, w.A3, w.B1])).toEqual(before);
};

const ids = (items: { id: string }[]): string[] =>
  items.map((item) => item.id).sort();

describe('own data', () => {
  it('lists only own organizations, and only the events of the organization in the URL', async () => {
    const w = await world();

    const organizations = await call(w.a, 'GET', 'organizations');
    expect(ids(organizations.body)).toEqual([w.A1, w.A2, w.A3].sort());
    expect(ids((await call(w.b, 'GET', 'organizations')).body)).toEqual([w.B1]);

    const inA1 = await call(w.a, 'GET', `organizations/${w.A1}/events`);
    expect(ids(inA1.body)).toEqual([w.E1.id, w.E2.id].sort());
    const inA2 = await call(w.a, 'GET', `organizations/${w.A2}/events`);
    expect(ids(inA2.body)).toEqual([w.E3.id]);
    // An organization without events is an empty list, not someone else's.
    const inA3 = await call(w.a, 'GET', `organizations/${w.A3}/events`);
    expect(inA3).toEqual({ status: 200, body: [] });
  });

  it('shows an event with only its own terms and rooms, in either own organization', async () => {
    const w = await world();
    for (const [organizationId, event] of [
      [w.A1, w.E1],
      [w.A1, w.E2],
      [w.A2, w.E3],
    ] as const) {
      const path = `organizations/${organizationId}/events/${event.id}`;
      const detail = await call(w.a, 'GET', path);
      expect(detail.status).toBe(200);
      expect(detail.body.id).toBe(event.id);
      expect(ids(detail.body.terms)).toEqual([event.termId]);

      const rooms = await call(w.a, 'GET', `${path}/rooms`);
      expect(ids(rooms.body.rooms)).toEqual([event.roomId]);
      expect(ids(rooms.body.terms)).toEqual([event.termId]);
    }
  });

  it('stores what is created in the organization and event it was created in', async () => {
    const w = await world();

    const created = await call(w.a, 'POST', `organizations/${w.A2}/events`, {
      name: 'Nová v A2',
      description: 'Popis',
      location: 'Místo',
    });
    expect(created.status).toBe(201);
    const stored = await prisma.event.findUniqueOrThrow({
      where: { id: created.body.id },
    });
    expect(stored.organizationId).toBe(w.A2);
    // Listed in A2 only, and still after another read of A1.
    expect(
      ids((await call(w.a, 'GET', `organizations/${w.A2}/events`)).body),
    ).toContain(created.body.id);
    expect(
      ids((await call(w.a, 'GET', `organizations/${w.A1}/events`)).body),
    ).not.toContain(created.body.id);

    const path = `organizations/${w.A1}/events/${w.E2.id}`;
    const term = await call(w.a, 'POST', `${path}/terms`, TERM);
    expect(term.status).toBe(201);
    const room1 = await call(w.a, 'POST', `${path}/rooms`, room([]));
    expect(room1.status).toBe(201);
    const settings = await call(
      w.a,
      'PUT',
      `${path}/payment-settings`,
      ACCOUNT,
    );
    expect(settings.status).toBe(200);

    const e2 = await prisma.event.findUniqueOrThrow({
      where: { id: w.E2.id },
      include: { terms: true, rooms: true },
    });
    expect(e2.terms.map((t) => t.label)).toContain(TERM.label);
    expect(e2.rooms.map((r) => r.label)).toContain('Podvržený pokoj');
    expect(e2.paymentReminderDays).toBe(ACCOUNT.paymentReminderDays);
    // Nothing of it reached the sibling event.
    const e1 = await prisma.event.findUniqueOrThrow({
      where: { id: w.E1.id },
      include: { terms: true, rooms: true },
    });
    expect(ids(e1.terms)).toEqual([w.E1.termId]);
    expect(ids(e1.rooms)).toEqual([w.E1.roomId]);
  });
});

describe('foreign and missing data', () => {
  it('refuses every read and write of A on B1 like a missing record, changing nothing', async () => {
    const w = await world();
    await expectAllUnavailable(w, w.a, [
      ...organizationOperations(w.B1),
      ...eventOperations(w.B1, w.F1),
    ]);
  });

  it('answers a missing organization, event, term or room the same way', async () => {
    const w = await world();
    const missing = {
      id: randomUUID(),
      termId: randomUUID(),
      roomId: randomUUID(),
    };
    await expectAllUnavailable(w, w.a, [
      ...organizationOperations(randomUUID()),
      ...eventOperations(randomUUID(), missing),
      ...eventOperations(w.A1, missing),
      // An own event with a term and room that do not exist.
      ...eventOperations(w.A1, {
        id: w.E1.id,
        termId: missing.termId,
        roomId: missing.roomId,
      }).filter(([, path]) => /\/(terms|rooms)\/./.test(path)),
    ]);
  });

  it('requires a session for every operation', async () => {
    const w = await world();
    for (const [method, path, body] of [
      ['GET', 'organizations'],
      ...organizationOperations(w.A1),
      ...eventOperations(w.A1, w.E1),
    ] as Operation[]) {
      const response = await fetch(`${baseUrl}/${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      expect({ method, path, status: response.status }).toEqual({
        method,
        path,
        status: 403,
      });
    }
  });
});

describe('identifiers swapped in the URL', () => {
  it('does not reach an event of B1 through the own organization A1', async () => {
    const w = await world();
    await expectAllUnavailable(w, w.a, eventOperations(w.A1, w.F1));
  });

  it('does not reach an event of the own A2 through A1, while A2 still shows it', async () => {
    const w = await world();
    await expectAllUnavailable(w, w.a, eventOperations(w.A1, w.E3));

    const own = await call(
      w.a,
      'GET',
      `organizations/${w.A2}/events/${w.E3.id}`,
    );
    expect(own.status).toBe(200);
    expect(own.body.id).toBe(w.E3.id);
  });

  it('does not reach a term or room of another event through an own event', async () => {
    const w = await world();
    // E2 is a sibling in A1, E3 is in the other own organization, F1 is foreign.
    const children = [w.E2, w.E3, w.F1].flatMap((other) =>
      eventOperations(w.A1, {
        id: w.E1.id,
        termId: other.termId,
        roomId: other.roomId,
      }).filter(([, path]) => /\/(terms|rooms)\/./.test(path)),
    );
    expect(children).toHaveLength(12);
    await expectAllUnavailable(w, w.a, children);

    // The same term and room stay reachable through their own event.
    const own = await call(
      w.a,
      'GET',
      `organizations/${w.A1}/events/${w.E2.id}/rooms`,
    );
    expect(ids(own.body.rooms)).toEqual([w.E2.roomId]);
  });
});

describe('identifiers swapped in the body', () => {
  it('refuses a term of another event in a room the same as a missing term', async () => {
    const w = await world();
    const path = `organizations/${w.A1}/events/${w.E1.id}/rooms`;
    const before = await snapshot([w.A1, w.A2, w.B1]);

    const responses: Call[] = [];
    for (const termId of [
      w.E2.termId,
      w.E3.termId,
      w.F1.termId,
      randomUUID(),
    ]) {
      responses.push(await call(w.a, 'POST', path, room([termId])));
      responses.push(
        await call(w.a, 'PUT', `${path}/${w.E1.roomId}`, room([termId])),
      );
    }
    for (const response of responses) {
      expect(response).toEqual({
        status: 400,
        body: {
          statusCode: 400,
          code: 'term_unknown',
          field: 'termIds',
          message: 'Dostupnost lze vybrat jen z termínů této akce.',
        },
      });
    }
    expect(await snapshot([w.A1, w.A2, w.B1])).toEqual(before);
  });

  it('does not take an organization or event from the body', async () => {
    const w = await world();
    const before = await snapshot([w.A1, w.B1]);
    const path = `organizations/${w.A1}/events`;

    const attempts = [
      await call(w.a, 'POST', path, { ...BASICS, organizationId: w.B1 }),
      await call(w.a, 'PUT', `${path}/${w.E1.id}`, {
        ...BASICS,
        organizationId: w.B1,
      }),
      await call(w.a, 'POST', `${path}/${w.E1.id}/terms`, {
        ...TERM,
        eventId: w.F1.id,
      }),
      await call(w.a, 'POST', `${path}/${w.E1.id}/rooms`, {
        ...room([]),
        eventId: w.F1.id,
      }),
      await call(w.a, 'POST', 'organizations', {
        name: 'Cizí vlastník',
        ownerId: w.b,
      }),
    ];
    for (const attempt of attempts) {
      expect(attempt.status).toBe(400);
    }
    expect(await snapshot([w.A1, w.B1])).toEqual(before);
    expect(
      await prisma.organization.count({ where: { name: 'Cizí vlastník' } }),
    ).toBe(0);
  });
});
