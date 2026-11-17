import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  AccommodationTermState,
  Registration,
} from '@/generated/prisma/client';
import {
  ProposalPlacements,
  WISHES_PREFERENCE,
} from '@/modules/accommodation/domain/proposal-input';
import { ProposalQueueRepository } from '@/modules/accommodation/repositories/proposal-queue.repository';
import {
  RoomProposalModel,
  RoomProposalRepository,
} from '@/modules/accommodation/repositories/room-proposal.repository';
import { TermEvaluationRepository } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { termLayoutChanged } from '@/modules/accommodation/repositories/term-inputs';
import { HardAttributeAnswers } from '@/modules/accommodation/services/hard-attribute-answers';
import { ProposalWorker } from '@/modules/accommodation/services/proposal-worker.service';
import {
  RoommateWishes,
  RoomPlacements,
} from '@/modules/accommodation/services/room-proposal-sources';
import {
  PROPOSAL_SOLVER_VERSION,
  RoomProposalService,
} from '@/modules/accommodation/services/room-proposal.service';
import { TermRoomProposalService } from '@/modules/accommodation/services/term-room-proposal.service';
import { RoommateWish } from '@/modules/accommodation/solver/room-proposal.types';
import * as runner from '@/modules/accommodation/solver/solver-runner';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createRegistration,
  RoomInput,
} from '@/testing/factories';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

process.env.ACCOMMODATION_WORKER_INTERVAL_MS = '0';
// Each case runs a worker-thread solve plus real database writes.
jest.setTimeout(30_000);

// #365 slice 2 against a real database: the room proposal of a term reads its
// rooms, confirmed participants and rules as they are now, stores an immutable
// record, and is queued like the evaluation, on the term's layout version
// (phase-2 spec §7). Answers, placements and wishes come from fakes; the real
// placements and wishes arrive with #337 and #339. Needs a migrated Postgres
// in DATABASE_URL: `pnpm backend test:db`.

class FakeAnswers extends HardAttributeAnswers {
  readonly byRegistration = new Map<string, string | null>();
  answers(): Promise<Map<string, string | null>> {
    return Promise.resolve(this.byRegistration);
  }
}

class FakePlacements extends RoomPlacements {
  value: ProposalPlacements = { saved: new Map(), otherTerms: new Map() };
  placements(): Promise<ProposalPlacements> {
    return Promise.resolve(this.value);
  }
}

class FakeWishes extends RoommateWishes {
  value: RoommateWish[] = [];
  wishes(): Promise<RoommateWish[]> {
    return Promise.resolve(this.value);
  }
}

let prisma: PrismaService;
let service: RoomProposalService;
let queue: ProposalQueueRepository;
let worker: ProposalWorker;
let close: () => Promise<void>;
let organizer: TermRoomProposalService;
const answers = new FakeAnswers();
const placements = new FakePlacements();
const wishes = new FakeWishes();

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    providers: [
      RoomProposalService,
      RoomProposalRepository,
      ProposalQueueRepository,
      ProposalWorker,
      TermEvaluationRepository,
      TermRoomProposalService,
      { provide: HardAttributeAnswers, useValue: answers },
      { provide: RoomPlacements, useValue: placements },
      { provide: RoommateWishes, useValue: wishes },
    ],
  }).compile();
  prisma = moduleRef.get(PrismaService);
  service = moduleRef.get(RoomProposalService);
  queue = moduleRef.get(ProposalQueueRepository);
  worker = moduleRef.get(ProposalWorker);
  organizer = moduleRef.get(TermRoomProposalService);
  close = (): Promise<void> => moduleRef.close();
});

afterAll(() => close());

beforeEach(() => {
  answers.byRegistration.clear();
  placements.value = { saved: new Map(), otherTerms: new Map() };
  wishes.value = [];
});

type Fixture = CreatedEvent & { ownerId: string };

const setup = async (
  rooms: RoomInput[],
  { gender = true, automatic = false, softAttributes = [] as string[] } = {},
): Promise<Fixture> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: 'open',
    terms: [
      {
        label: 'T1',
        startDate: '2027-07-01',
        endDate: '2027-07-07',
        priceMinor: 100_000,
      },
      {
        label: 'T2',
        startDate: '2027-08-01',
        endDate: '2027-08-07',
        priceMinor: 100_000,
      },
    ],
    rooms,
  });
  await prisma.event.update({
    where: { id: created.event.id },
    data: { isRoomProposalAutomatic: automatic },
  });
  if (gender || softAttributes.length) {
    await prisma.accommodationRules.create({
      data: {
        eventId: created.event.id,
        hardAttribute: gender ? 'gender' : null,
        nonDeterminingValues: gender ? ['other', 'undisclosed'] : [],
        softAttributes,
      },
    });
  }
  return { ...created, ownerId: organization.ownerId };
};

let clock = Date.parse('2027-03-01T10:00:00Z');

/** Received a minute after the previous one, in the first term. */
const person = async (
  f: Fixture,
  answer: string | null,
  status: 'confirmed' | 'pending' = 'confirmed',
): Promise<Registration> => {
  const registration = await createRegistration(prisma, {
    event: f.event,
    terms: [{ term: f.terms[0], status }],
  });
  clock += 60_000;
  await prisma.registration.update({
    where: { id: registration.id },
    data: { receivedAt: new Date(clock) },
  });
  answers.byRegistration.set(registration.id, answer);
  return registration;
};

const propose = async (f: Fixture): Promise<RoomProposalModel> =>
  (await service.proposeTerm(f.event.id, f.terms[0].id, {
    triggeredById: f.ownerId,
    layoutVersion: (await stateOf(f))?.layoutVersion ?? 0,
  })) as RoomProposalModel;

type Solved = {
  status: 'solved';
  rooms: Record<string, string>;
  unplaced: { id: string; reason: string }[];
  stats: { complete: boolean };
};

const stateOf = (
  f: Fixture,
  index = 0,
): Promise<AccommodationTermState | null> =>
  prisma.accommodationTermState.findUnique({
    where: { termId: f.terms[index].id },
  });

describe('the room proposal of a term', () => {
  it('lays out only the confirmed people, never mixing genders, and stores what it read', async () => {
    const f = await setup([
      { label: 'A', baseBeds: 2, termIndexes: [0, 1] },
      { label: 'B', baseBeds: 2, termIndexes: [0, 1] },
      { label: 'Zavřený', baseBeds: 4, termIndexes: [1] },
    ]);
    const jana = await person(f, 'female');
    const eva = await person(f, 'female');
    const petr = await person(f, 'male');
    const waiting = await person(f, 'male', 'pending');

    const stored = await propose(f);

    expect(stored).toMatchObject({
      status: 'solved',
      triggeredById: f.ownerId,
      solverVersion: PROPOSAL_SOLVER_VERSION,
      layoutVersion: 0,
      error: null,
    });
    const result = stored.result as Solved;
    expect(Object.keys(result.rooms).sort()).toEqual(
      [jana.id, eva.id, petr.id].sort(),
    );
    expect(result.rooms).not.toHaveProperty(waiting.id);
    expect(result.rooms[jana.id]).toBe(result.rooms[eva.id]);
    expect(result.rooms[petr.id]).not.toBe(result.rooms[jana.id]);

    // The snapshot: person order by receipt, every room of the event with its
    // beds in the term, the closed one unavailable, and the rules.
    const { input, rules } = stored.input;
    expect(input.participants.map((p) => [p.id, p.position, p.value])).toEqual([
      [jana.id, 0, 'female'],
      [eva.id, 1, 'female'],
      [petr.id, 2, 'male'],
    ]);
    expect(
      input.rooms.map((r) => [r.label, r.available, r.baseBeds]).sort(),
    ).toEqual([
      ['A', true, 2],
      ['B', true, 2],
      ['Zavřený', false, 0],
    ]);
    expect(input.hasHardAttribute).toBe(true);
    expect(input.preferences).toEqual([{ kind: 'wishes' }]);
    expect(rules.hardAttribute?.attribute).toBe('gender');
  });

  it('passes saved placements, rooms of other terms and wishes to the solver', async () => {
    const f = await setup([
      { label: 'A', baseBeds: 2, termIndexes: [0] },
      { label: 'B', baseBeds: 2, termIndexes: [0] },
    ]);
    const [roomA, roomB] = f.rooms.sort((x, y) =>
      x.label.localeCompare(y.label),
    );
    const jana = await person(f, 'female');
    const eva = await person(f, 'female');
    placements.value = {
      saved: new Map([[jana.id, { roomId: roomB!.id, isLocked: true }]]),
      otherTerms: new Map([[eva.id, [roomA!.id]]]),
    };
    wishes.value = [{ from: eva.id, to: jana.id }];

    const stored = await propose(f);

    const [first, second] = stored.input.input.participants;
    expect(first).toMatchObject({ savedRoomId: roomB!.id, locked: true });
    expect(second).toMatchObject({ otherTermRoomIds: [roomA!.id] });
    expect(stored.input.input.wishes).toEqual([{ from: eva.id, to: jana.id }]);
    // The lock holds; the wish (U3) outranks the room of another term (U2 is
    // only for people without a saved room, and Eva has none here).
    const result = stored.result as Solved;
    expect(result.rooms[jana.id]).toBe(roomB!.id);
  });

  it('reads soft answers for the ranked attributes and keeps the list order', async () => {
    const f = await setup([{ label: 'A', baseBeds: 2, termIndexes: [0] }], {
      gender: false,
      softAttributes: ['gender', WISHES_PREFERENCE],
    });
    const jana = await person(f, 'female');

    const stored = await propose(f);

    expect(stored.input.input.preferences).toEqual([
      {
        kind: 'attribute',
        id: 'gender',
        neutralValues: ['other', 'undisclosed'],
      },
      { kind: 'wishes' },
    ]);
    expect(stored.input.input.participants[0]).toMatchObject({
      id: jana.id,
      value: null,
      softValues: { gender: 'female' },
    });
  });

  it('shows a term without confirmed people as an empty layout', async () => {
    const f = await setup([{ label: 'A', baseBeds: 2, termIndexes: [0] }]);
    await person(f, 'female', 'pending');

    const stored = await propose(f);

    expect(stored.status).toBe('solved');
    expect((stored.result as Solved).rooms).toEqual({});
  });

  it('proposes nothing for a term of another event', async () => {
    const f = await setup([]);
    const other = await setup([]);

    expect(
      await service.proposeTerm(f.event.id, other.terms[0].id, {
        triggeredById: null,
        layoutVersion: 0,
      }),
    ).toBeNull();
  });
});

describe('the proposal queue', () => {
  it('runs a requested proposal once, as the organizer, on the version it read', async () => {
    const f = await setup([{ label: 'A', baseBeds: 2, termIndexes: [0] }]);
    await person(f, 'female');
    await prisma.$transaction((tx) => termLayoutChanged(tx, f.event.id));
    await queue.request(f.event.id, f.terms[0].id, f.ownerId);

    await worker.drain(f.event.id);
    await worker.drain(f.event.id);

    const stored = await prisma.accommodationRoomProposal.findMany({
      where: { termId: f.terms[0].id },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      status: 'solved',
      triggeredById: f.ownerId,
      layoutVersion: 1,
    });
    expect(await stateOf(f)).toMatchObject({
      proposalDueAt: null,
      proposalRunningId: null,
    });
  });

  it('never runs two proposals of a term at once; a change meanwhile waits for the next', async () => {
    const f = await setup([], { automatic: true });
    await queue.request(f.event.id, f.terms[0].id, f.ownerId);
    const [claimed] = await queue.claimDue(1, f.event.id);
    expect(claimed).toMatchObject({
      triggeredById: f.ownerId,
      layoutVersion: 0,
    });

    await prisma.$transaction((tx) => termLayoutChanged(tx, f.event.id));
    await prisma.accommodationTermState.update({
      where: { termId: f.terms[0].id },
      data: { proposalDueAt: new Date(Date.now() - 1000) },
    });
    expect(await queue.claimDue(1, f.event.id)).toEqual([]);

    await queue.release(f.terms[0].id, claimed!.proposalId);
    const [next] = await queue.claimDue(1, f.event.id);
    expect(next).toMatchObject({ layoutVersion: 1, triggeredById: null });
  });

  it('runs an automatic proposal 10 s after a layout change, as the system', async () => {
    const f = await setup([{ label: 'A', baseBeds: 2, termIndexes: [0] }], {
      automatic: true,
    });
    await person(f, 'female');
    await prisma.$transaction((tx) =>
      termLayoutChanged(tx, f.event.id, [f.terms[0].id]),
    );
    await worker.drain(f.event.id);
    expect(
      await prisma.accommodationRoomProposal.count({
        where: { termId: f.terms[0].id },
      }),
    ).toBe(0);

    await prisma.accommodationTermState.update({
      where: { termId: f.terms[0].id },
      data: { proposalDueAt: new Date(Date.now() - 1000) },
    });
    await worker.drain(f.event.id);

    expect(
      await prisma.accommodationRoomProposal.findMany({
        where: { termId: f.terms[0].id },
      }),
    ).toMatchObject([
      { status: 'solved', triggeredById: null, layoutVersion: 1 },
    ]);
  });

  it('takes over a proposal abandoned for 120 s; the old process’s release changes nothing', async () => {
    const f = await setup([]);
    await queue.request(f.event.id, f.terms[0].id, f.ownerId);
    const [first] = await queue.claimDue(1, f.event.id);
    await prisma.accommodationTermState.update({
      where: { termId: f.terms[0].id },
      data: { proposalRunningSince: new Date(Date.now() - 121_000) },
    });

    const [second] = await queue.claimDue(1, f.event.id);
    expect(second).toMatchObject({ triggeredById: f.ownerId });
    expect(second!.proposalId).not.toBe(first!.proposalId);

    await queue.release(f.terms[0].id, first!.proposalId);
    expect(await stateOf(f)).toMatchObject({
      proposalRunningId: second!.proposalId,
    });
  });

  it('stores a failed or timed-out solve without a layout and frees the term', async () => {
    const f = await setup([{ label: 'A', baseBeds: 2, termIndexes: [0] }]);
    await person(f, 'female');
    const solve = jest.spyOn(runner, 'solveRoomProposalInWorker');
    solve.mockRejectedValueOnce(new Error('worker crashed'));
    solve.mockResolvedValueOnce({
      status: 'timeout',
      stats: { millis: 30_000, solves: 1, complete: false },
    });

    for (let run = 0; run < 2; run++) {
      await queue.request(f.event.id, f.terms[0].id, f.ownerId);
      await worker.drain(f.event.id);
    }
    solve.mockRestore();

    const stored = await prisma.accommodationRoomProposal.findMany({
      where: { termId: f.terms[0].id },
      orderBy: { startedAt: 'asc' },
    });
    expect(stored).toMatchObject([
      { status: 'failed', error: 'worker crashed', result: null },
      { status: 'timeout', error: null, result: { status: 'timeout' } },
    ]);
    expect(await stateOf(f)).toMatchObject({
      proposalRunningId: null,
      proposalDueAt: null,
    });
  });
});

describe('the organizer’s room proposal (Návrh pokojů)', () => {
  const scopeOf = (f: Fixture, ownerId = f.ownerId): EventScope => ({
    organizationId: f.event.organizationId,
    ownerId,
    eventId: f.event.id,
  });

  it('is manual for a new event; turning it off drops scheduled proposals, not a requested one', async () => {
    const f = await setup([]);
    const scope = scopeOf(f);
    expect(await organizer.mode(scope)).toBe('manual');

    await organizer.saveMode(scope, 'automatic');
    expect(await organizer.mode(scope)).toBe('automatic');
    await prisma.$transaction((tx) =>
      termLayoutChanged(tx, f.event.id, [f.terms[0].id]),
    );
    await queue.request(f.event.id, f.terms[1].id, f.ownerId);
    const requested = (await stateOf(f, 1))!.proposalDueAt;

    await organizer.saveMode(scope, 'manual');

    expect(await stateOf(f)).toMatchObject({ proposalDueAt: null });
    expect(await stateOf(f, 1)).toMatchObject({
      proposalDueAt: requested,
      proposalRequestedById: f.ownerId,
    });
    // The evaluation mode is a separate setting.
    expect(
      (await prisma.event.findUnique({ where: { id: f.event.id } }))
        ?.accommodationEvaluationMode,
    ).toBe('automatic');
  });

  it('shows none, running after "Navrhnout pokoje", then the current proposal, stale after a change', async () => {
    const f = await setup([
      { label: 'Pokoj 2', baseBeds: 2, termIndexes: [0] },
      { label: 'Pokoj 1', baseBeds: 1, termIndexes: [0] },
    ]);
    const scope = scopeOf(f);
    const anna = await person(f, 'female');
    const bara = await person(f, 'female');
    const cyril = await person(f, 'male');
    const term = f.terms[0].id;

    expect(await organizer.term(scope, term)).toMatchObject({
      mode: 'manual',
      status: 'none',
      proposal: null,
    });

    expect(await organizer.propose(scope, term)).toMatchObject({
      status: 'running',
    });
    await worker.drain(f.event.id);

    const view = await organizer.term(scope, term);
    expect(view).toMatchObject({
      status: 'current',
      scheduledAt: null,
      proposal: {
        status: 'solved',
        isCurrent: true,
        triggeredBy: { id: f.ownerId },
      },
    });
    const layout = view.proposal!.layout!;
    expect(layout.rooms.map((r) => [r.label, r.personIds])).toEqual([
      ['Pokoj 1', [cyril.id]],
      ['Pokoj 2', [anna.id, bara.id]],
    ]);
    expect(layout.people.map((p) => [p.firstName, p.change])).toEqual([
      [anna.firstName, 'new'],
      [bara.firstName, 'new'],
      [cyril.firstName, 'new'],
    ]);
    expect(layout.summary).toMatchObject({ placed: 3, added: 3, rooms: 2 });

    await prisma.$transaction((tx) => termLayoutChanged(tx, f.event.id));
    expect(await organizer.term(scope, term)).toMatchObject({
      status: 'stale',
      proposal: { isCurrent: false },
    });
    // Reading never proposes.
    expect(await stateOf(f)).toMatchObject({ proposalDueAt: null });
  });

  it('keeps showing the last solved proposal after a failed rerun', async () => {
    const f = await setup([{ label: 'A', baseBeds: 2, termIndexes: [0] }]);
    const scope = scopeOf(f);
    await person(f, 'female');
    await organizer.propose(scope, f.terms[0].id);
    await worker.drain(f.event.id);
    const solve = jest
      .spyOn(runner, 'solveRoomProposalInWorker')
      .mockRejectedValueOnce(new Error('worker crashed'));

    await organizer.propose(scope, f.terms[0].id);
    await worker.drain(f.event.id);
    solve.mockRestore();

    const view = await organizer.term(scope, f.terms[0].id);
    expect(view).toMatchObject({
      status: 'failed',
      proposal: { status: 'failed', layout: null },
      lastSolved: {
        status: 'solved',
        isCurrent: true,
        layout: { summary: { placed: 1 } },
      },
    });
  });

  it('is not available for a foreign event or a term of another event', async () => {
    const f = await setup([]);
    const other = await setup([]);
    const term = f.terms[0].id;

    await expect(
      organizer.term(scopeOf(f, other.ownerId), term),
    ).rejects.toThrow(NotFoundException);
    await expect(
      organizer.propose(scopeOf(f, other.ownerId), term),
    ).rejects.toThrow(NotFoundException);
    await expect(
      organizer.saveMode(scopeOf(f, other.ownerId), 'automatic'),
    ).rejects.toThrow(NotFoundException);
    await expect(organizer.mode(scopeOf(f, other.ownerId))).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      organizer.propose(scopeOf(f), other.terms[0].id),
    ).rejects.toThrow(NotFoundException);
    expect(await stateOf(other)).toBeNull();
    expect(await organizer.mode(scopeOf(f))).toBe('manual');
  });
});
