import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
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

// S2-05 through the HTTP API against a real database: controllers, validation,
// service rules, the term row locks and the constraints together. Only the
// BetterAuth session is replaced: the `x-test-user` header names the caller.
// Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

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
    controllers: [RoomsController],
    providers: [RoomsService, RoomsRepository],
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

const SUMMER = [
  { startDate: '2027-07-01', endDate: '2027-07-07', label: 'T1' },
  { startDate: '2027-07-15', endDate: '2027-07-21', label: 'T2' },
];

type EventFixture = {
  ownerId: string;
  path: string;
  organizationId: string;
  eventId: string;
  termIds: string[];
  prisma: PrismaService;
  terms: { id: string }[];
  event: { id: string };
};

/** An own organization with one event, by default open (hence locked). */
const eventWith = async (
  options: {
    terms?: typeof SUMMER;
    status?: 'draft' | 'open' | 'closed';
  } = {},
): Promise<EventFixture> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: options.status ?? 'open',
    terms: options.terms ?? SUMMER,
  });
  return {
    ownerId: owner.id,
    organizationId: organization.id,
    eventId: created.event.id,
    termIds: created.terms.map((term) => term.id),
    terms: created.terms,
    event: created.event,
    prisma,
    path: `organizations/${organization.id}/events/${created.event.id}/rooms`,
  };
};

const confirm = async (
  fixture: { event: { id: string }; terms: { id: string }[] },
  termIndexes: number[],
  status: 'confirmed' | 'waitlisted' = 'confirmed',
): Promise<void> => {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: fixture.event.id },
  });
  const terms = await prisma.eventTerm.findMany({
    where: { id: { in: termIndexes.map((index) => fixture.terms[index].id) } },
  });
  await createRegistration(prisma, {
    event,
    terms: terms.map((term) => ({ term, status })),
  });
};

const capacities = (body: {
  terms: { label: string; capacity: number }[];
}): Record<string, number> =>
  Object.fromEntries(body.terms.map((term) => [term.label, term.capacity]));

describe('adding rooms and the capacity of terms', () => {
  it('lists each room with its beds and availability, and sums capacity per term', async () => {
    const f = await eventWith();

    const first = await call(f.ownerId, 'POST', f.path, {
      label: 'Pokoj 1',
      bedCount: 2,
      termIds: [f.termIds[0]],
    });
    expect(first.status).toBe(201);
    const second = await call(f.ownerId, 'POST', f.path, {
      label: 'Pokoj 2',
      bedCount: 3,
      termIds: f.termIds,
    });

    expect(second.body.rooms).toEqual([
      expect.objectContaining({
        label: 'Pokoj 1',
        bedCount: 2,
        termIds: [f.termIds[0]],
      }),
      expect.objectContaining({
        label: 'Pokoj 2',
        bedCount: 3,
        termIds: expect.arrayContaining(f.termIds),
      }),
    ]);
    expect(capacities(second.body)).toEqual({ T1: 5, T2: 3 });

    // Persisted, and visible again after a reload.
    const reloaded = await call(f.ownerId, 'GET', f.path);
    expect(reloaded.body).toEqual(second.body);
  });

  it('does not count rooms of another event or rooms unavailable in the term', async () => {
    const f = await eventWith();
    const other = await eventWith();
    await call(other.ownerId, 'POST', other.path, {
      label: 'Cizí',
      bedCount: 9,
      termIds: other.termIds,
    });
    await call(f.ownerId, 'POST', f.path, {
      label: 'Bez termínu',
      bedCount: 7,
      termIds: [],
    });

    const overview = await call(f.ownerId, 'GET', f.path);
    expect(capacities(overview.body)).toEqual({ T1: 0, T2: 0 });
  });

  it('saves a room without terms, even in an event without terms, and assigns terms later', async () => {
    const f = await eventWith({ terms: [], status: 'draft' });
    const created = await call(f.ownerId, 'POST', f.path, {
      label: 'Pokoj 1',
      bedCount: 4,
      termIds: [],
    });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      rooms: [expect.objectContaining({ label: 'Pokoj 1', termIds: [] })],
      terms: [],
    });

    const term = await prisma.eventTerm.create({
      data: {
        eventId: f.eventId,
        label: 'Nový',
        startDate: new Date('2027-08-01T00:00:00Z'),
        endDate: new Date('2027-08-02T00:00:00Z'),
        priceMinor: 0,
      },
    });
    const assigned = await call(
      f.ownerId,
      'PUT',
      `${f.path}/${created.body.rooms[0].id}`,
      { label: 'Pokoj 1', bedCount: 4, termIds: [term.id] },
    );
    expect(capacities(assigned.body)).toEqual({ Nový: 4 });
  });

  it('shows an empty overview with zero capacity for an event without rooms', async () => {
    const f = await eventWith();
    const overview = await call(f.ownerId, 'GET', f.path);
    expect(overview.body.rooms).toEqual([]);
    expect(capacities(overview.body)).toEqual({ T1: 0, T2: 0 });
  });
});

describe('room labels', () => {
  const room = (
    label: string,
  ): { label: string; bedCount: number; termIds: string[] } => ({
    label,
    bedCount: 2,
    termIds: [],
  });

  it('are unique per event ignoring case and outer spaces', async () => {
    const f = await eventWith();
    await call(f.ownerId, 'POST', f.path, room('Pokoj 1'));

    for (const label of ['pokoj 1', ' Pokoj 1 ', 'POKOJ 1']) {
      const duplicate = await call(f.ownerId, 'POST', f.path, room(label));
      expect(duplicate).toMatchObject({
        status: 409,
        body: { code: 'room_label_taken', field: 'label' },
      });
    }
    const overview = await call(f.ownerId, 'GET', f.path);
    expect(overview.body.rooms).toHaveLength(1);
  });

  it('are stored trimmed and refused when only spaces', async () => {
    const f = await eventWith();
    const created = await call(f.ownerId, 'POST', f.path, room('  Chata  '));
    expect(created.body.rooms[0].label).toBe('Chata');

    for (const label of ['   ', '', undefined]) {
      const refused = await call(
        f.ownerId,
        'POST',
        f.path,
        room(label as string),
      );
      expect(refused.status).toBe(400);
    }
  });

  it('allow the same label in another event and renaming a room to its own label', async () => {
    const f = await eventWith();
    const other = await eventWith();
    await call(other.ownerId, 'POST', other.path, room('Pokoj 1'));
    const created = await call(f.ownerId, 'POST', f.path, room('Pokoj 1'));
    expect(created.status).toBe(201);

    const renamed = await call(
      f.ownerId,
      'PUT',
      `${f.path}/${created.body.rooms[0].id}`,
      room('pokoj 1'),
    );
    expect(renamed.status).toBe(200);
    expect(renamed.body.rooms[0].label).toBe('pokoj 1');
  });

  it('refuse a rename to the label of a different room and keep the old one', async () => {
    const f = await eventWith();
    await call(f.ownerId, 'POST', f.path, room('A'));
    const b = await call(f.ownerId, 'POST', f.path, room('B'));

    const clash = await call(
      f.ownerId,
      'PUT',
      `${f.path}/${b.body.rooms[1].id}`,
      room(' a '),
    );
    expect(clash.status).toBe(409);
    const overview = await call(f.ownerId, 'GET', f.path);
    expect(overview.body.rooms.map((r: { label: string }) => r.label)).toEqual([
      'A',
      'B',
    ]);
  });

  it('cannot be duplicated by concurrent creates', async () => {
    const f = await eventWith();
    const results = await Promise.all(
      ['Pokoj 1', 'pokoj 1', ' POKOJ 1 ', 'Pokoj 1'].map((label) =>
        call(f.ownerId, 'POST', f.path, room(label)),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    expect(await prisma.room.count({ where: { eventId: f.eventId } })).toBe(1);
  });
});

describe('bed counts and terms in the input', () => {
  it.each([0, -3, 1.5, '2', null, undefined, 1001])(
    'refuse %p beds',
    async (bedCount) => {
      const f = await eventWith();
      const refused = await call(f.ownerId, 'POST', f.path, {
        label: 'Pokoj',
        bedCount,
        termIds: [],
      });
      expect(refused.status).toBe(400);
      expect(await prisma.room.count({ where: { eventId: f.eventId } })).toBe(
        0,
      );
    },
  );

  it('refuses a term of another event, saving nothing', async () => {
    const f = await eventWith();
    const other = await eventWith();
    const refused = await call(f.ownerId, 'POST', f.path, {
      label: 'Pokoj',
      bedCount: 2,
      termIds: [f.termIds[0], other.termIds[0]],
    });
    expect(refused).toMatchObject({
      status: 400,
      body: { code: 'term_unknown' },
    });
    expect(await prisma.room.count({ where: { eventId: f.eventId } })).toBe(0);
  });
});

describe('protecting confirmed capacity', () => {
  /** Rooms of 2 and 3 beds in T1 (5), the 3-bed one also in T2 (3). */
  const setup = async (): Promise<
    EventFixture & { smallId: string; bigId: string }
  > => {
    const f = await eventWith();
    const small = await call(f.ownerId, 'POST', f.path, {
      label: 'Malý',
      bedCount: 2,
      termIds: [f.termIds[0]],
    });
    const big = await call(f.ownerId, 'POST', f.path, {
      label: 'Velký',
      bedCount: 3,
      termIds: f.termIds,
    });
    return {
      ...f,
      smallId: small.body.rooms[0].id as string,
      bigId: big.body.rooms[1].id as string,
    };
  };

  it('allows lowering beds to the confirmed count and refuses going below', async () => {
    const f = await setup();
    await confirm(f, [0]);
    await confirm(f, [0]);
    await confirm(f, [0]);
    // A waitlisted participant takes no bed.
    await confirm(f, [0], 'waitlisted');

    const lowered = await call(f.ownerId, 'PUT', `${f.path}/${f.smallId}`, {
      label: 'Malý',
      bedCount: 1,
      termIds: [f.termIds[0]],
    });
    expect(lowered.status).toBe(200);
    expect(capacities(lowered.body)).toEqual({ T1: 4, T2: 3 });

    const tooLow = await call(f.ownerId, 'PUT', `${f.path}/${f.bigId}`, {
      label: 'Velký',
      bedCount: 1,
      termIds: f.termIds,
    });
    expect(tooLow.status).toBe(409);
    expect(tooLow.body).toMatchObject({ code: 'capacity_below_confirmed' });
    expect(tooLow.body.message).toContain('T1');
    expect(tooLow.body.message).toContain('3');
  });

  it('refuses removing availability or the room, keeping the room as it was', async () => {
    const f = await setup();
    await confirm(f, [1]);

    const unavailable = await call(f.ownerId, 'PUT', `${f.path}/${f.bigId}`, {
      label: 'Přejmenovaný',
      bedCount: 3,
      termIds: [f.termIds[0]],
    });
    expect(unavailable).toMatchObject({
      status: 409,
      body: { code: 'capacity_below_confirmed' },
    });
    expect(unavailable.body.message).toContain('T2');

    const removed = await call(f.ownerId, 'DELETE', `${f.path}/${f.bigId}`);
    expect(removed.status).toBe(409);

    const overview = await call(f.ownerId, 'GET', f.path);
    expect(overview.body.rooms[1]).toMatchObject({
      label: 'Velký',
      bedCount: 3,
      termIds: expect.arrayContaining(f.termIds),
    });
    expect(capacities(overview.body)).toEqual({ T1: 5, T2: 3 });
  });

  it('saves a change touching several terms completely or not at all', async () => {
    const f = await setup();
    await confirm(f, [1]); // T2 is full: 1 of 3... then 3 more fill it
    await confirm(f, [1]);
    await confirm(f, [1]);

    // T1 would drop to 2 (fine, nobody confirmed), T2 to 0 (not fine).
    const refused = await call(f.ownerId, 'PUT', `${f.path}/${f.bigId}`, {
      label: 'Jiný',
      bedCount: 1,
      termIds: [f.termIds[0]],
    });
    expect(refused.status).toBe(409);

    const room = await prisma.room.findUniqueOrThrow({
      where: { id: f.bigId },
      include: { availabilities: true },
    });
    expect(room.label).toBe('Velký');
    expect(room.bedCount).toBe(3);
    expect(room.availabilities).toHaveLength(2);
  });

  it('lets capacity grow and delete an unneeded room, in an open event', async () => {
    const f = await setup();
    await confirm(f, [0]);

    const grown = await call(f.ownerId, 'PUT', `${f.path}/${f.smallId}`, {
      label: 'Malý',
      bedCount: 10,
      termIds: [f.termIds[0]],
    });
    expect(capacities(grown.body)).toEqual({ T1: 13, T2: 3 });

    const removed = await call(f.ownerId, 'DELETE', `${f.path}/${f.smallId}`);
    expect(removed.status).toBe(200);
    expect(capacities(removed.body)).toEqual({ T1: 3, T2: 3 });
  });

  it('keeps waitlisted registrations as they were when capacity grows', async () => {
    const f = await setup();
    await confirm(f, [0], 'waitlisted');
    await call(f.ownerId, 'PUT', `${f.path}/${f.smallId}`, {
      label: 'Malý',
      bedCount: 20,
      termIds: [f.termIds[0]],
    });
    expect(
      await prisma.registrationTerm.count({
        where: { status: 'waitlisted', eventId: f.eventId },
      }),
    ).toBe(1);
  });

  it('never lets capacity fall below confirmations made at the same time', async () => {
    const f = await eventWith({ terms: [SUMMER[0]] });
    const created = await call(f.ownerId, 'POST', f.path, {
      label: 'Pokoj',
      bedCount: 4,
      termIds: f.termIds,
    });
    const roomId = created.body.rooms[0].id as string;
    const event = await prisma.event.findUniqueOrThrow({
      where: { id: f.eventId },
    });
    const registrations = await Promise.all(
      Array.from({ length: 4 }, () =>
        createRegistration(prisma, { event, terms: [] }),
      ),
    );

    // What S2-08 does on submit: lock the term, then confirm while a bed is free.
    const confirmWhileFree = (registrationId: string): Promise<void> =>
      prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`SELECT "id" FROM "event_term" WHERE "id" = ${f.termIds[0]}::uuid FOR UPDATE`;
        const term = await tx.eventTerm.findUniqueOrThrow({
          where: { id: f.termIds[0] },
          select: {
            roomAvailabilities: {
              select: { room: { select: { bedCount: true } } },
            },
            _count: {
              select: { registrationTerms: { where: { status: 'confirmed' } } },
            },
          },
        });
        const capacity = term.roomAvailabilities.reduce(
          (sum, a) => sum + a.room.bedCount,
          0,
        );
        const status =
          term._count.registrationTerms < capacity ? 'confirmed' : 'waitlisted';
        await tx.registrationTerm.create({
          data: {
            registrationId,
            termId: f.termIds[0],
            eventId: f.eventId,
            status,
            priceMinor: 0,
            decidedAt: new Date(),
          },
        });
      });

    await Promise.all([
      ...registrations.map((r) => confirmWhileFree(r.id)),
      call(f.ownerId, 'PUT', `${f.path}/${roomId}`, {
        label: 'Pokoj',
        bedCount: 2,
        termIds: f.termIds,
      }),
    ]);

    const [overview, room] = await Promise.all([
      call(f.ownerId, 'GET', f.path),
      prisma.room.findUniqueOrThrow({ where: { id: roomId } }),
    ]);
    const term = overview.body.terms[0];
    expect(term.capacity).toBe(room.bedCount);
    expect(term.confirmed).toBeLessThanOrEqual(term.capacity);
  });
});

describe('access', () => {
  it('treats a foreign organization or event like a missing one, for reading and writing', async () => {
    const mine = await eventWith();
    const foreign = await eventWith();
    const created = await call(foreign.ownerId, 'POST', foreign.path, {
      label: 'Cizí',
      bedCount: 2,
      termIds: [],
    });
    const foreignRoom = created.body.rooms[0].id as string;
    const input = { label: 'X', bedCount: 1, termIds: [] };

    expect((await call(mine.ownerId, 'GET', foreign.path)).status).toBe(404);
    expect((await call(mine.ownerId, 'POST', foreign.path, input)).status).toBe(
      404,
    );
    expect(
      (await call(mine.ownerId, 'PUT', `${foreign.path}/${foreignRoom}`, input))
        .status,
    ).toBe(404);
    expect(
      (await call(mine.ownerId, 'DELETE', `${foreign.path}/${foreignRoom}`))
        .status,
    ).toBe(404);

    // The own organization with the foreign event's id, and a foreign room in own event.
    const crossed = `organizations/${mine.organizationId}/events/${foreign.eventId}/rooms`;
    expect((await call(mine.ownerId, 'GET', crossed)).status).toBe(404);
    expect(
      (await call(mine.ownerId, 'PUT', `${mine.path}/${foreignRoom}`, input))
        .status,
    ).toBe(404);
    expect(
      (await call(mine.ownerId, 'DELETE', `${mine.path}/${foreignRoom}`))
        .status,
    ).toBe(404);

    expect(await prisma.room.count({ where: { id: foreignRoom } })).toBe(1);
  });

  it('requires a session', async () => {
    const f = await eventWith();
    const response = await fetch(`${baseUrl}/${f.path}`);
    expect(response.status).toBe(403);
  });
});
