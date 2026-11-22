import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Gender,
  ParticipationStatus,
  Registration,
} from '@/generated/prisma/client';
import { RoomPlacementsController } from '@/modules/accommodation/controllers/room-placements.controller';
import { RoomPlacementsRepository } from '@/modules/accommodation/repositories/room-placements.repository';
import { RoomPlacementsService } from '@/modules/accommodation/services/room-placements.service';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createOrganizer,
  createRegistration,
  RoomInput,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// F14-2 (#337) through the HTTP API against a real database: the organizer
// places confirmed participants of a term into rooms, moves and removes them,
// confirms exceptions to the rules of a room and locks placements. The guard
// is replaced: `x-test-user` names the organizer. Needs a migrated Postgres
// in DATABASE_URL: `pnpm backend test:db`.

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
    controllers: [RoomPlacementsController],
    providers: [RoomPlacementsService, RoomPlacementsRepository],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

type Call = { status: number; body: ReturnType<typeof JSON.parse> };

type Fixture = CreatedEvent & {
  ownerId: string;
  /** `…/accommodation/terms/:termId/placements` of a term. */
  path: (termIndex?: number) => string;
  person: (
    name: string,
    statuses: ParticipationStatus[],
    gender?: Gender,
  ) => Promise<Registration>;
  call: (
    method: 'GET' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    user?: string,
  ) => Promise<Call>;
  place: (
    registration: Registration,
    roomIndex: number,
    extra?: Record<string, unknown>,
    termIndex?: number,
  ) => Promise<Call>;
};

const DEFAULT_ROOMS: RoomInput[] = [
  { label: 'A', baseBeds: 2, extraBeds: 1, termIndexes: [0, 1] },
  { label: 'B', baseBeds: 1, termIndexes: [0, 1] },
  { label: 'C', baseBeds: 2, termIndexes: [1] },
];

const setup = async ({
  gender = true,
  rooms = DEFAULT_ROOMS,
} = {}): Promise<Fixture> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: 'open',
    terms: [
      { label: 'T1', startDate: '2027-07-01', endDate: '2027-07-07' },
      { label: 'T2', startDate: '2027-08-01', endDate: '2027-08-07' },
    ],
    rooms,
  });
  if (gender) {
    await prisma.accommodationRules.create({
      data: {
        eventId: created.event.id,
        hardAttribute: 'gender',
        nonDeterminingValues: ['other', 'undisclosed'],
      },
    });
  }
  const path = (termIndex = 0): string =>
    `organizations/${organization.id}/events/${created.event.id}/accommodation/terms/${created.terms[termIndex].id}/placements`;
  const call: Fixture['call'] = async (method, url, body, user = owner.id) => {
    const response = await fetch(`${baseUrl}/${url}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-test-user': user },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  return {
    ...created,
    ownerId: owner.id,
    path,
    call,
    person: async (name, statuses, personGender): Promise<Registration> => {
      const registration = await createRegistration(prisma, {
        event: created.event,
        terms: statuses.map((status, index) => ({
          term: created.terms[index],
          status,
        })),
      });
      const [firstName, lastName] = name.split(' ');
      return prisma.registration.update({
        where: { id: registration.id },
        data: { firstName, lastName, gender: personGender ?? null },
      });
    },
    place: (registration, roomIndex, extra = {}, termIndex = 0) =>
      call('PUT', `${path(termIndex)}/${registration.id}`, {
        roomId: created.rooms[roomIndex].id,
        ...extra,
      }),
  };
};

type RoomView = {
  label: string;
  occupants: { name: string; isLocked: boolean; confirmedWarnings: string[] }[];
  warnings: string[];
};

/** Room label → occupant names, for rooms with someone in them. */
const layout = (body: { rooms: RoomView[] }): Record<string, string[]> =>
  Object.fromEntries(
    body.rooms
      .filter((room) => room.occupants.length > 0)
      .map((room) => [room.label, room.occupants.map((o) => o.name)]),
  );

const room = (body: { rooms: RoomView[] }, label: string): RoomView =>
  body.rooms.find((r) => r.label === label)!;

describe('the rooms of a term', () => {
  it('lists every room with its beds in the term, and the confirmed participants without one', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    await f.person('Petr Čekající', ['waitlisted']);
    await f.person('Eva Nová', ['pending']);
    const tom = await f.person('Tomáš Bez', ['confirmed'], 'other');

    const { status, body } = await f.call('GET', f.path());
    expect(status).toBe(200);
    expect(body).toEqual({
      hardAttribute: 'gender',
      rooms: [
        expect.objectContaining({
          label: 'A',
          isAvailable: true,
          baseBeds: 2,
          extraBeds: 1,
          occupants: [],
          warnings: [],
        }),
        expect.objectContaining({ label: 'B', baseBeds: 1, isAvailable: true }),
        // No settings in T1: unavailable, without beds.
        expect.objectContaining({
          label: 'C',
          isAvailable: false,
          baseBeds: 0,
          extraBeds: 0,
        }),
      ],
      unplaced: [
        { registrationId: jana.id, name: 'Jana Svobodová', value: 'female' },
        // A non-determining answer gives no value.
        { registrationId: tom.id, name: 'Tomáš Bez', value: null },
      ],
    });
  });

  it('is only for the organizer of the event', async () => {
    const f = await setup();
    const stranger = await createOrganizer(prisma);
    expect((await f.call('GET', f.path(), undefined, stranger.id)).status).toBe(
      404,
    );
    const other = await setup();
    // A term of another event under this event's path.
    const foreign = f.path().replace(f.terms[0].id, other.terms[0].id);
    expect((await f.call('GET', foreign)).status).toBe(404);

    // Changes too: a stranger can't place, remove or lock.
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    const roomId = f.rooms[0].id;
    const at = `${f.path()}/${jana.id}`;
    for (const [method, url, body] of [
      ['PUT', at, { roomId }],
      ['DELETE', at, undefined],
      ['PUT', `${at}/lock`, { isLocked: true }],
    ] as const) {
      expect((await f.call(method, url, body, stranger.id)).status).toBe(404);
    }
    expect(
      await prisma.roomPlacement.count({ where: { eventId: f.event.id } }),
    ).toBe(0);
  });
});

describe('placing, moving and removing', () => {
  it('updates the occupancy and frees the place left, without touching participation or the order', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    const anna = await f.person('Anna Malá', ['confirmed'], 'female');
    const stateBefore = await prisma.accommodationTermState.findUnique({
      where: { termId: f.terms[0].id },
    });

    let saved = await f.place(jana, 0);
    expect(saved.status).toBe(200);
    expect(layout(saved.body)).toEqual({ A: ['Jana Svobodová'] });
    expect(saved.body.unplaced.map((p: { name: string }) => p.name)).toEqual([
      'Anna Malá',
    ]);

    saved = await f.place(anna, 0);
    expect(layout(saved.body)).toEqual({ A: ['Anna Malá', 'Jana Svobodová'] });

    saved = await f.place(jana, 1);
    expect(layout(saved.body)).toEqual({
      A: ['Anna Malá'],
      B: ['Jana Svobodová'],
    });

    saved = await f.call('DELETE', `${f.path()}/${jana.id}`);
    expect(saved.status).toBe(200);
    expect(layout(saved.body)).toEqual({ A: ['Anna Malá'] });
    expect(saved.body.unplaced.map((p: { name: string }) => p.name)).toEqual([
      'Jana Svobodová',
    ]);
    // Removing someone without a room changes nothing.
    expect((await f.call('DELETE', `${f.path()}/${jana.id}`)).status).toBe(200);

    const terms = await prisma.registrationTerm.findMany({
      where: { termId: f.terms[0].id },
      select: { status: true },
    });
    expect(terms.map((t) => t.status)).toEqual(['confirmed', 'confirmed']);
    // The evaluation stays as it was; each of the four saved changes makes the
    // room proposal stale (phase-2 spec §7.1), the removal of nothing doesn't.
    const stateAfter = await prisma.accommodationTermState.findUnique({
      where: { termId: f.terms[0].id },
    });
    expect(stateAfter).toMatchObject({
      inputVersion: stateBefore?.inputVersion ?? 0,
      dueAt: stateBefore?.dueAt ?? null,
      layoutVersion: (stateBefore?.layoutVersion ?? 0) + 4,
    });
  });

  it('keeps each term on its own', async () => {
    const f = await setup();
    const jana = await f.person(
      'Jana Svobodová',
      ['confirmed', 'confirmed'],
      'female',
    );
    await f.place(jana, 0, {}, 0);
    const second = await f.place(jana, 2, {}, 1);
    expect(layout(second.body)).toEqual({ C: ['Jana Svobodová'] });
    expect(layout((await f.call('GET', f.path(0))).body)).toEqual({
      A: ['Jana Svobodová'],
    });
  });

  it('refuses someone not confirmed in the term, a room unavailable in it and a room of another event', async () => {
    const f = await setup();
    const eva = await f.person('Eva Nová', ['pending', 'confirmed']);
    const jana = await f.person('Jana Svobodová', ['confirmed']);
    const other = await setup();

    expect((await f.place(eva, 0)).body).toMatchObject({
      statusCode: 409,
      code: 'participant_not_confirmed',
    });
    expect((await f.place(jana, 2)).body).toMatchObject({
      statusCode: 409,
      code: 'room_unavailable',
    });
    expect(
      (
        await f.call('PUT', `${f.path()}/${jana.id}`, {
          roomId: other.rooms[0].id,
        })
      ).status,
    ).toBe(404);
    const outsider = await other.person('Cizí Osoba', ['confirmed']);
    expect((await f.place(outsider, 0)).status).toBe(404);
    expect(
      await prisma.roomPlacement.count({ where: { eventId: f.event.id } }),
    ).toBe(0);
  });

  it('shows someone who stops being confirmed nowhere, and frees their bed', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    await f.place(jana, 1);
    await prisma.registrationTerm.update({
      where: {
        registrationId_termId: {
          registrationId: jana.id,
          termId: f.terms[0].id,
        },
      },
      data: { status: 'cancelled' },
    });
    const { body } = await f.call('GET', f.path());
    expect(layout(body)).toEqual({});
    expect(body.unplaced).toEqual([]);
  });

  it('lets the organizer clear the locked placement of someone no longer confirmed', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    await f.place(jana, 1, { lock: true });
    await prisma.registrationTerm.update({
      where: {
        registrationId_termId: {
          registrationId: jana.id,
          termId: f.terms[0].id,
        },
      },
      data: { status: 'cancelled' },
    });
    expect((await f.call('DELETE', `${f.path()}/${jana.id}`)).status).toBe(200);
    expect(
      await prisma.roomPlacement.count({ where: { eventId: f.event.id } }),
    ).toBe(0);
  });

  it('drops the placements of a deleted room', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    await f.place(jana, 1);
    await prisma.room.delete({ where: { id: f.rooms[1].id } });
    const { body } = await f.call('GET', f.path());
    expect(body.unplaced.map((p: { name: string }) => p.name)).toEqual([
      'Jana Svobodová',
    ]);
  });
});

describe('warnings and exceptions', () => {
  it('saves a mixed room only once the organizer confirms it, and offers to lock it', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    const petr = await f.person('Petr Novák', ['confirmed'], 'male');
    await f.place(jana, 0);

    const refused = await f.place(petr, 0);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({
      code: 'placement_warnings',
      warnings: ['mixed'],
    });
    expect(layout((await f.call('GET', f.path())).body)).toEqual({
      A: ['Jana Svobodová'],
    });

    const saved = await f.place(petr, 0, {
      confirmWarnings: ['mixed'],
      lock: true,
    });
    expect(saved.status).toBe(200);
    expect(room(saved.body, 'A')).toMatchObject({
      warnings: ['mixed'],
      occupants: [
        { name: 'Jana Svobodová', isLocked: false, confirmedWarnings: [] },
        { name: 'Petr Novák', isLocked: true, confirmedWarnings: ['mixed'] },
      ],
    });
  });

  it('warns about an extra bed and about capacity', async () => {
    const f = await setup({ gender: false });
    const people = await Promise.all(
      ['Ada A', 'Bea B', 'Cyril C', 'Dana D'].map((name) =>
        f.person(name, ['confirmed']),
      ),
    );
    await f.place(people[0], 0);
    await f.place(people[1], 0);
    expect((await f.place(people[2], 0)).body).toMatchObject({
      code: 'placement_warnings',
      warnings: ['extra_bed'],
    });
    const third = await f.place(people[2], 0, {
      confirmWarnings: ['extra_bed'],
    });
    expect(room(third.body, 'A').warnings).toEqual(['extra_bed']);
    expect((await f.place(people[3], 0)).body).toMatchObject({
      code: 'placement_warnings',
      warnings: ['over_capacity'],
    });
  });

  it('asks again about a warning that appeared after the one confirmed', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    // No determining answer: she mixes with nobody.
    const anna = await f.person('Anna Malá', ['confirmed'], 'other');
    const petr = await f.person('Petr Novák', ['confirmed'], 'male');
    // Room B has one bed: Petr sees only "over capacity" while Anna is there.
    await f.place(anna, 1);
    expect((await f.place(petr, 1)).body.warnings).toEqual(['over_capacity']);
    // Meanwhile Jana takes Anna's place; the room would now be mixed too.
    await f.call('DELETE', `${f.path()}/${anna.id}`);
    await f.place(jana, 1);
    const retried = await f.place(petr, 1, {
      confirmWarnings: ['over_capacity'],
    });
    expect(retried.status).toBe(409);
    expect(retried.body.warnings).toEqual(['mixed', 'over_capacity']);
    expect(layout((await f.call('GET', f.path())).body)).toEqual({
      B: ['Jana Svobodová'],
    });
  });

  it('never lets two placements fill the last bed without a warning', async () => {
    const f = await setup({ gender: false });
    const ada = await f.person('Ada A', ['confirmed']);
    const bea = await f.person('Bea B', ['confirmed']);
    const results = await Promise.all([f.place(ada, 1), f.place(bea, 1)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.roomPlacement.count({ where: { roomId: f.rooms[1].id } }),
    ).toBe(1);
  });
});

describe('locks', () => {
  it('keeps a locked placement from manual moves and removal until it is unlocked', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    await f.place(jana, 0);
    const locked = await f.call('PUT', `${f.path()}/${jana.id}/lock`, {
      isLocked: true,
    });
    expect(room(locked.body, 'A').occupants[0].isLocked).toBe(true);

    expect((await f.place(jana, 1)).body).toMatchObject({
      code: 'placement_locked',
    });
    expect(
      (await f.call('DELETE', `${f.path()}/${jana.id}`)).body,
    ).toMatchObject({ code: 'placement_locked' });
    // The same room again is fine and keeps the lock.
    expect(room((await f.place(jana, 0)).body, 'A').occupants[0].isLocked).toBe(
      true,
    );

    await f.call('PUT', `${f.path()}/${jana.id}/lock`, { isLocked: false });
    expect(layout((await f.place(jana, 1)).body)).toEqual({
      B: ['Jana Svobodová'],
    });
  });

  it('needs a placement to lock', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed'], 'female');
    expect(
      (await f.call('PUT', `${f.path()}/${jana.id}/lock`, { isLocked: true }))
        .body,
    ).toMatchObject({ statusCode: 409, code: 'not_placed' });
  });
});
