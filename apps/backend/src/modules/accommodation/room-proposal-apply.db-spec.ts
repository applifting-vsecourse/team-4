import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Gender,
  ParticipationStatus,
  Registration,
} from '@/generated/prisma/client';
import { RoomPlacementsController } from '@/modules/accommodation/controllers/room-placements.controller';
import { RoomProposalController } from '@/modules/accommodation/controllers/room-proposal.controller';
import { ProposalQueueRepository } from '@/modules/accommodation/repositories/proposal-queue.repository';
import { RoomPlacementsRepository } from '@/modules/accommodation/repositories/room-placements.repository';
import { RoomProposalRepository } from '@/modules/accommodation/repositories/room-proposal.repository';
import { TermEvaluationRepository } from '@/modules/accommodation/repositories/term-evaluation.repository';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from '@/modules/accommodation/services/hard-attribute-answers';
import { RoomPlacementsService } from '@/modules/accommodation/services/room-placements.service';
import {
  RoommateWishes,
  RoomPlacements,
  StoredRoommateWishes,
  StoredRoomPlacements,
} from '@/modules/accommodation/services/room-proposal-sources';
import { RoomProposalService } from '@/modules/accommodation/services/room-proposal.service';
import { TermRoomProposalService } from '@/modules/accommodation/services/term-room-proposal.service';
import { RoommateWishesRepository } from '@/modules/registrations/repositories/roommate-wishes.repository';
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

process.env.ACCOMMODATION_WORKER_INTERVAL_MS = '0';
// One case runs a worker-thread solve.
jest.setTimeout(30_000);

// #365 against a real database: the room proposal reads the saved placements,
// locks and roommate wishes (F14-2, S4-05); every change of them makes the
// proposal stale (phase-2 spec §7.1); "Použít návrh" saves the proposal's
// rooms, all of it or nothing (§7.2); the term's wishes show their state in
// the saved placements (#317). The guard is replaced: `x-test-user` names
// the organizer. Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

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
let proposals: RoomProposalService;
let wishes: RoommateWishesRepository;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [RoomPlacementsController, RoomProposalController],
    providers: [
      RoomPlacementsService,
      RoomPlacementsRepository,
      RoomProposalService,
      RoomProposalRepository,
      ProposalQueueRepository,
      TermEvaluationRepository,
      TermRoomProposalService,
      RoommateWishesRepository,
      {
        provide: HardAttributeAnswers,
        useClass: RegistrationHardAttributeAnswers,
      },
      { provide: RoomPlacements, useClass: StoredRoomPlacements },
      { provide: RoommateWishes, useClass: StoredRoommateWishes },
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
  proposals = app.get(RoomProposalService);
  wishes = app.get(RoommateWishesRepository);
});

afterAll(() => app.close());

type Call = { status: number; body: ReturnType<typeof JSON.parse> };

type Fixture = CreatedEvent & {
  ownerId: string;
  /** `…/accommodation` of the event. */
  base: string;
  person: (
    name: string,
    statuses: ParticipationStatus[],
    gender?: Gender,
  ) => Promise<Registration>;
  call: (
    method: 'GET' | 'PUT' | 'POST' | 'DELETE',
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
  layoutVersion: (termIndex?: number) => Promise<number>;
  /** A stored solved proposal of T1 with these rooms, on the current version. */
  storeProposal: (
    people: Registration[],
    rooms: Record<string, number | null>,
  ) => Promise<string>;
  apply: (proposalId: string, submissionKey?: string) => Promise<Call>;
  /** Room label → people in it, saved in T1. */
  saved: () => Promise<Record<string, string[]>>;
};

const DEFAULT_ROOMS: RoomInput[] = [
  { label: 'A', baseBeds: 2, termIndexes: [0, 1] },
  { label: 'B', baseBeds: 1, extraBeds: 1, termIndexes: [0, 1] },
];

const setup = async (rooms = DEFAULT_ROOMS): Promise<Fixture> => {
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
  await prisma.accommodationRules.create({
    data: {
      eventId: created.event.id,
      hardAttribute: 'gender',
      nonDeterminingValues: ['other', 'undisclosed'],
    },
  });
  const base = `organizations/${organization.id}/events/${created.event.id}/accommodation`;
  const call: Fixture['call'] = async (method, url, body, user = owner.id) => {
    const response = await fetch(`${baseUrl}/${url}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-test-user': user },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const layoutVersion = async (termIndex = 0): Promise<number> =>
    (
      await prisma.accommodationTermState.findUnique({
        where: { termId: created.terms[termIndex].id },
      })
    )?.layoutVersion ?? 0;
  const apply: Fixture['apply'] = (proposalId, submissionKey = randomUUID()) =>
    call('POST', `${base}/terms/${created.terms[0].id}/room-proposal/apply`, {
      proposalId,
      submissionKey,
    });
  return {
    ...created,
    ownerId: owner.id,
    base,
    call,
    layoutVersion,
    apply,
    person: async (name, statuses, gender = 'female') => {
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
        data: { firstName, lastName, gender },
      });
    },
    place: (registration, roomIndex, extra = {}, termIndex = 0) =>
      call(
        'PUT',
        `${base}/terms/${created.terms[termIndex].id}/placements/${registration.id}`,
        { roomId: created.rooms[roomIndex].id, ...extra },
      ),
    storeProposal: async (people, rooms) => {
      const stored = await prisma.accommodationRoomProposal.create({
        data: {
          eventId: created.event.id,
          termId: created.terms[0].id,
          status: 'solved',
          solverVersion: 'test',
          input: {
            rules: {},
            input: {
              participants: people.map((p, position) => ({
                id: p.id,
                position,
              })),
            },
          },
          result: {
            status: 'solved',
            rooms: Object.fromEntries(
              Object.entries(rooms)
                .filter(([, room]) => room !== null)
                .map(([id, room]) => [id, created.rooms[room!].id]),
            ),
          },
          layoutVersion: await layoutVersion(),
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      });
      return stored.id;
    },
    saved: async () => {
      const rows = await prisma.roomPlacement.findMany({
        where: { termId: created.terms[0].id },
        select: {
          room: { select: { label: true } },
          registrationTerm: {
            select: {
              registration: { select: { firstName: true } },
            },
          },
        },
      });
      const out: Record<string, string[]> = {};
      for (const row of rows) {
        (out[row.room.label] ??= []).push(
          row.registrationTerm.registration.firstName,
        );
      }
      for (const names of Object.values(out)) names.sort();
      return out;
    },
  };
};

describe('the proposal reads the saved placements and wishes', () => {
  it('keeps a lock, follows a wish, and applying it saves the rooms', async () => {
    const f = await setup([
      { label: 'A', baseBeds: 2, termIndexes: [0] },
      { label: 'B', baseBeds: 2, termIndexes: [0] },
    ]);
    const jana = await f.person('Jana Svobodová', ['confirmed']);
    const eva = await f.person('Eva Malá', ['confirmed']);
    const petra = await f.person('Petra Nová', ['confirmed']);
    // Jana is locked in B, which then has one bed left: Eva's wish for Petra
    // fits only in A.
    expect((await f.place(jana, 1, { lock: true })).status).toBe(200);
    const saved = await wishes.replaceForParticipant(
      eva.participantAccountId,
      eva.id,
      [petra.id],
    );
    expect(saved?.result).toBe('saved');

    const proposal = await proposals.proposeTerm(f.event.id, f.terms[0].id, {
      triggeredById: f.ownerId,
      layoutVersion: await f.layoutVersion(),
    });
    expect(proposal?.status).toBe('solved');
    const result = proposal!.result as { rooms: Record<string, string> };
    expect(result.rooms).toEqual({
      [jana.id]: f.rooms[1].id,
      [eva.id]: f.rooms[0].id,
      [petra.id]: f.rooms[0].id,
    });

    const applied = await f.apply(proposal!.id);
    expect(applied.status).toBe(200);
    expect(applied.body).toEqual({
      added: 2,
      moved: 0,
      removed: 0,
      layoutVersion: proposal!.layoutVersion + 1,
    });
    expect(await f.saved()).toEqual({ A: ['Eva', 'Petra'], B: ['Jana'] });
    const kept = await prisma.roomPlacement.findUniqueOrThrow({
      where: {
        registrationId_termId: {
          registrationId: jana.id,
          termId: f.terms[0].id,
        },
      },
    });
    expect(kept.isLocked).toBe(true);

    // The term shows the proposal as applied, not stale, until it changes.
    const termView = () =>
      f.call('GET', `${f.base}/terms/${f.terms[0].id}/room-proposal`);
    let view = await termView();
    expect(view.body.status).toBe('applied');
    expect(view.body.lastSolved).toMatchObject({ isCurrent: false });
    expect(view.body.lastSolved.appliedAt).toEqual(expect.any(String));

    const states = await f.call(
      'GET',
      `${f.base}/terms/${f.terms[0].id}/roommate-wishes`,
    );
    expect(states.status).toBe(200);
    expect(states.body).toEqual({
      wishes: [
        {
          from: { registrationId: eva.id, name: 'Eva Malá' },
          to: { registrationId: petra.id, name: 'Petra Nová' },
          saved: 'satisfied',
        },
      ],
    });

    // A manual move afterwards makes it stale like any other change.
    await f.place(eva, 1);
    view = await termView();
    expect(view.body.status).toBe('stale');
    expect(view.body.lastSolved.appliedAt).toBeNull();
  });
});

describe('Použít návrh', () => {
  it('moves, adds and removes the unlocked, and keeps the locked as they are', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed']);
    const anna = await f.person('Anna Malá', ['confirmed']);
    const eva = await f.person('Eva Nová', ['confirmed']);
    const olga = await f.person('Olga Bílá', ['confirmed']);
    await f.place(jana, 0);
    await f.place(anna, 0);
    await f.place(olga, 1, { lock: true });
    // Jana moves to B (its extra bed, beside the locked Olga), Eva gets A,
    // Anna loses her room; the proposal can't move Olga.
    const proposalId = await f.storeProposal([jana, anna, eva, olga], {
      [jana.id]: 1,
      [anna.id]: null,
      [eva.id]: 0,
      [olga.id]: 0,
    });
    const before = await f.layoutVersion();

    const applied = await f.apply(proposalId);
    expect(applied.status).toBe(200);
    expect(applied.body).toEqual({
      added: 1,
      moved: 1,
      removed: 1,
      layoutVersion: before + 1,
    });
    expect(await f.saved()).toEqual({ A: ['Eva'], B: ['Jana', 'Olga'] });
    // Applying accepts the extra bed the proposal uses.
    const moved = await prisma.roomPlacement.findUniqueOrThrow({
      where: {
        registrationId_termId: {
          registrationId: jana.id,
          termId: f.terms[0].id,
        },
      },
    });
    expect(moved).toMatchObject({
      isLocked: false,
      confirmedWarnings: ['extra_bed'],
      placedById: f.ownerId,
    });
    const participation = await prisma.registrationTerm.findMany({
      where: { termId: f.terms[0].id },
      select: { status: true },
    });
    expect(participation.every((t) => t.status === 'confirmed')).toBe(true);
  });

  it('refuses a stale proposal and saves nothing', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed']);
    const anna = await f.person('Anna Malá', ['confirmed']);
    const proposalId = await f.storeProposal([jana, anna], {
      [jana.id]: 0,
      [anna.id]: 0,
    });
    // A manual placement after the proposal makes it stale (§7.1).
    await f.place(anna, 1);

    const refused = await f.apply(proposalId);
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('proposal_stale');
    expect(await f.saved()).toEqual({ B: ['Anna'] });
    expect(
      await prisma.roomProposalApplication.count({ where: { proposalId } }),
    ).toBe(0);
  });

  it('answers a repeated request with the first result, even once stale', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed']);
    const proposalId = await f.storeProposal([jana], { [jana.id]: 0 });
    const key = randomUUID();

    const first = await f.apply(proposalId, key);
    expect(first.status).toBe(200);
    const again = await f.apply(proposalId, key);
    expect(again).toEqual(first);
    expect(await f.layoutVersion()).toBe(first.body.layoutVersion);
    expect(
      await prisma.roomProposalApplication.count({ where: { proposalId } }),
    ).toBe(1);
    // A new attempt with the same, now stale, proposal is refused.
    expect((await f.apply(proposalId)).status).toBe(409);
  });

  it('makes the other confirmed terms of everyone moved stale', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed', 'confirmed']);
    const anna = await f.person('Anna Malá', ['confirmed', 'waitlisted']);
    const proposalId = await f.storeProposal([jana, anna], {
      [jana.id]: 0,
      [anna.id]: 0,
    });
    const t2 = await f.layoutVersion(1);

    expect((await f.apply(proposalId)).status).toBe(200);
    expect(await f.layoutVersion(1)).toBe(t2 + 1);
  });

  it('refuses a proposal that has no layout', async () => {
    const f = await setup();
    const failed = await prisma.accommodationRoomProposal.create({
      data: {
        eventId: f.event.id,
        termId: f.terms[0].id,
        status: 'failed',
        error: 'Worker crashed',
        solverVersion: 'test',
        input: {},
        layoutVersion: await f.layoutVersion(),
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });

    const refused = await f.apply(failed.id);
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('proposal_stale');
  });

  it('is only for the organizer of the event and a proposal of the term', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed']);
    const proposalId = await f.storeProposal([jana], { [jana.id]: 0 });
    const stranger = await createOrganizer(prisma);

    const foreign = await f.call(
      'POST',
      `${f.base}/terms/${f.terms[0].id}/room-proposal/apply`,
      { proposalId, submissionKey: randomUUID() },
      stranger.id,
    );
    expect(foreign.status).toBe(404);
    const otherTerm = await f.call(
      'POST',
      `${f.base}/terms/${f.terms[1].id}/room-proposal/apply`,
      { proposalId, submissionKey: randomUUID() },
    );
    expect(otherTerm.status).toBe(404);
    expect(await f.saved()).toEqual({});
  });
});

describe('what makes a proposal stale', () => {
  it('a placement in another term of someone confirmed in both', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed', 'confirmed']);
    const anna = await f.person('Anna Malá', ['confirmed', 'waitlisted']);
    const t2 = await f.layoutVersion(1);

    await f.place(jana, 0);
    expect(await f.layoutVersion(1)).toBe(t2 + 1);
    await f.place(anna, 0);
    expect(await f.layoutVersion(1)).toBe(t2 + 1);
  });

  it('a wish, only in the terms where both people are confirmed', async () => {
    const f = await setup();
    const eva = await f.person('Eva Malá', ['confirmed', 'confirmed']);
    const petra = await f.person('Petra Nová', ['confirmed', 'waitlisted']);
    const [t1, t2] = [await f.layoutVersion(0), await f.layoutVersion(1)];

    await wishes.replaceForParticipant(eva.participantAccountId, eva.id, [
      petra.id,
    ]);
    expect([await f.layoutVersion(0), await f.layoutVersion(1)]).toEqual([
      t1 + 1,
      t2,
    ]);
    // Saving the same wishes again changes nothing; removing one does.
    await wishes.replaceForParticipant(eva.participantAccountId, eva.id, [
      petra.id,
    ]);
    expect(await f.layoutVersion(0)).toBe(t1 + 1);
    await wishes.replaceForParticipant(eva.participantAccountId, eva.id, []);
    expect([await f.layoutVersion(0), await f.layoutVersion(1)]).toEqual([
      t1 + 2,
      t2,
    ]);
  });
});

describe('the wishes of a term', () => {
  it('shows each wish between confirmed people with its state in the saved rooms', async () => {
    const f = await setup();
    const eva = await f.person('Eva Malá', ['confirmed']);
    const petra = await f.person('Petra Nová', ['confirmed']);
    const jana = await f.person('Jana Svobodová', ['confirmed']);
    const karel = await f.person('Karel Dvořák', ['confirmed'], 'male');
    const olga = await f.person('Olga Bílá', ['waitlisted']);
    for (const [from, to] of [
      [eva, [petra, jana, karel]],
      [petra, [olga]],
    ] as const) {
      // The organizer confirmed Olga before; she is a candidate no longer.
      await prisma.roommateWish.createMany({
        data: to.map((person) => ({
          eventId: f.event.id,
          fromRegistrationId: from.id,
          toRegistrationId: person.id,
        })),
      });
    }
    await f.place(eva, 0);
    await f.place(petra, 0);
    await f.place(jana, 1);

    const states = await f.call(
      'GET',
      `${f.base}/terms/${f.terms[0].id}/roommate-wishes`,
    );
    expect(states.status).toBe(200);
    expect(
      states.body.wishes.map(
        (w: { from: { name: string }; to: { name: string }; saved: string }) =>
          `${w.from.name} → ${w.to.name}: ${w.saved}`,
      ),
    ).toEqual([
      'Eva Malá → Jana Svobodová: unsatisfied',
      'Eva Malá → Karel Dvořák: impossible',
      'Eva Malá → Petra Nová: satisfied',
    ]);

    const stranger = await createOrganizer(prisma);
    expect(
      (
        await f.call(
          'GET',
          `${f.base}/terms/${f.terms[0].id}/roommate-wishes`,
          undefined,
          stranger.id,
        )
      ).status,
    ).toBe(404);
  });
});

describe('locking', () => {
  it('waits for a writer holding terms FOR UPDATE in id order instead of deadlocking', async () => {
    const f = await setup();
    const jana = await f.person('Jana Svobodová', ['confirmed', 'confirmed']);
    const [first, second] = [...f.terms]
      .map((term) => term.id)
      .sort((a, b) => (a < b ? -1 : 1));
    const later = f.terms.findIndex((term) => term.id === second);

    let placing: Promise<Call> | undefined;
    // Like a room change or a new registration: terms FOR UPDATE, by id.
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "event_term" WHERE "id" = ${first}::uuid FOR UPDATE`;
        // A placement in the later term of someone confirmed in both.
        placing = f.place(jana, 0, {}, later);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await tx.$queryRaw`SELECT "id" FROM "event_term" WHERE "id" = ${second}::uuid FOR UPDATE`;
      },
      { timeout: 10_000 },
    );

    expect((await placing!).status).toBe(200);
  });
});
