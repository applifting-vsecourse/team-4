import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import {
  AccommodationEvaluationRepository,
  AccommodationRunModel,
} from '@/modules/accommodation/repositories/accommodation-evaluation.repository';
import {
  AccommodationEvaluationService,
  SOLVER_VERSION,
} from '@/modules/accommodation/services/accommodation-evaluation.service';
import { HardAttributeAnswers } from '@/modules/accommodation/services/hard-attribute-answers';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createRegistration,
  RoomInput,
} from '@/testing/factories';
import { Test } from '@nestjs/testing';

// S3-T4 against a real database: the evaluation of one term reads its rooms,
// beds and participations as they are now, applies the rules, the organizer's
// determinations and a manual order, and stores an immutable run. Examples
// refer to the S3-T3 specification v4 §8. Answers to the hard attribute come
// from a fake until a story stores them. Needs a migrated Postgres in
// DATABASE_URL: `pnpm backend test:db`.

/** Answers by registration, set per test. */
class FakeAnswers extends HardAttributeAnswers {
  readonly byRegistration = new Map<string, string | null>();

  answers(): Promise<Map<string, string | null>> {
    return Promise.resolve(this.byRegistration);
  }
}

let prisma: PrismaService;
let service: AccommodationEvaluationService;
const answers = new FakeAnswers();

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    providers: [
      AccommodationEvaluationService,
      AccommodationEvaluationRepository,
      { provide: HardAttributeAnswers, useValue: answers },
    ],
  }).compile();
  prisma = moduleRef.get(PrismaService);
  service = moduleRef.get(AccommodationEvaluationService);
});

beforeEach(() => answers.byRegistration.clear());

const GENDER = {
  hardAttribute: 'gender',
  nonDeterminingValues: ['Jiná odpověď', 'Nechci uvést'],
};

type Fixture = CreatedEvent & { ownerId: string };

const setup = async (
  rooms: RoomInput[],
  { terms = 1, gender = true } = {},
): Promise<Fixture> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: 'open',
    terms: Array.from({ length: terms }, (_, index) => ({
      label: `T${index + 1}`,
      startDate: `2027-0${index + 7}-01`,
      endDate: `2027-0${index + 7}-07`,
      priceMinor: 100_000,
    })),
    rooms,
  });
  if (gender) {
    await prisma.accommodationRules.create({
      data: { eventId: created.event.id, ...GENDER },
    });
  }
  return { ...created, ownerId: organization.ownerId };
};

let clock = Date.parse('2027-03-01T10:00:00Z');

/** A registration received a minute after the previous one, unless given. */
const person = async (
  fixture: Fixture,
  answer: string | null,
  {
    terms = [0],
    status = 'waitlisted',
    receivedAt,
  }: {
    terms?: number[];
    status?: 'confirmed' | 'waitlisted';
    receivedAt?: Date;
  } = {},
): Promise<Registration> => {
  const registration = await createRegistration(prisma, {
    event: fixture.event,
    terms: terms.map((index) => ({ term: fixture.terms[index], status })),
  });
  clock += 60_000;
  await prisma.registration.update({
    where: { id: registration.id },
    data: { receivedAt: receivedAt ?? new Date(clock) },
  });
  answers.byRegistration.set(registration.id, answer);
  return registration;
};

const evaluate = async (
  fixture: Fixture,
  term = 0,
): Promise<AccommodationRunModel> =>
  (await service.evaluateTerm(fixture.event.id, fixture.terms[term].id, {
    triggeredById: fixture.ownerId,
  })) as AccommodationRunModel;

type Proposal = {
  suitable: string[];
  unplaced: { id: string; reason: string }[];
  beds: { baseUsed: number; extraUsed: number };
  conflicting?: string[];
};

const proposal = (run: AccommodationRunModel): Proposal =>
  run.result as Proposal;

const reasons = (run: AccommodationRunModel): Record<string, string> =>
  Object.fromEntries(proposal(run).unplaced.map((u) => [u.id, u.reason]));

describe('evaluating a term', () => {
  it('orders by receipt, the lower id first at the same moment (Př. 1)', async () => {
    const fixture = await setup([{ baseBeds: 2, termIndexes: [0] }]);
    const moment = new Date('2027-03-02T10:00:00.000Z');
    const a = await person(fixture, 'Žena', { receivedAt: moment });
    const b = await person(fixture, 'Žena', { receivedAt: moment });
    const [first, second] = [a, b].sort((x, y) => (x.id < y.id ? -1 : 1));
    const p3 = await person(fixture, 'Žena', {
      receivedAt: new Date(moment.getTime() + 1),
    });

    const run = await evaluate(fixture);

    expect(run.status).toBe('solved');
    expect(run.input.order.map((p) => p.registrationId)).toEqual([
      first.id,
      second.id,
      p3.id,
    ]);
    expect(proposal(run).suitable).toEqual([first.id, second.id]);
    expect(reasons(run)).toEqual({ [p3.id]: 'A' });
  });

  it('uses extra beds as the last places and follows a change of beds in that term only (Př. 2)', async () => {
    const fixture = await setup(
      [
        { baseBeds: 2, extraBeds: 1, termIndexes: [0, 1], label: 'R1' },
        { baseBeds: 2, termIndexes: [0, 1], label: 'R2' },
      ],
      { terms: 2 },
    );
    const people: Registration[] = [];
    for (let i = 0; i < 6; i += 1) {
      people.push(await person(fixture, 'Žena', { terms: [0, 1] }));
    }

    const before = await evaluate(fixture);
    expect(proposal(before).suitable).toHaveLength(5);
    expect(proposal(before).beds).toMatchObject({ baseUsed: 4, extraUsed: 1 });
    expect(reasons(before)).toEqual({ [people[5].id]: 'A' });

    await prisma.roomTermAvailability.updateMany({
      where: { termId: fixture.terms[0].id },
      data: { extraBeds: 0 },
    });
    const after = await evaluate(fixture);
    const otherTerm = await evaluate(fixture, 1);

    expect(proposal(after).suitable).toHaveLength(4);
    expect(reasons(after)[people[4].id]).toBe('A');
    expect(proposal(otherTerm).suitable).toHaveLength(5);
  });

  it('keeps rooms to one value and prefers more people over the order (Př. 3, Př. 4)', async () => {
    const homogeneity = await setup([
      { baseBeds: 3, termIndexes: [0] },
      { baseBeds: 1, termIndexes: [0] },
    ]);
    const [w1, w2, m1, m2] = [
      await person(homogeneity, 'Žena'),
      await person(homogeneity, 'Žena'),
      await person(homogeneity, 'Muž'),
      await person(homogeneity, 'Muž'),
    ];
    const first = await evaluate(homogeneity);
    expect(proposal(first).suitable).toEqual([w1.id, w2.id, m1.id]);
    expect(reasons(first)).toEqual({ [m2.id]: 'B' });

    const count = await setup([{ baseBeds: 3, termIndexes: [0] }]);
    const man = await person(count, 'Muž');
    const women = [
      await person(count, 'Žena'),
      await person(count, 'Žena'),
      await person(count, 'Žena'),
    ];
    const second = await evaluate(count);
    expect(proposal(second).suitable).toEqual(women.map((w) => w.id));
    expect(reasons(second)).toEqual({ [man.id]: 'C' });
  });

  it('never guesses a value, and uses the organizer’s determination until the answer changes (Př. 5)', async () => {
    const fixture = await setup([
      { baseBeds: 2, termIndexes: [0] },
      { baseBeds: 2, termIndexes: [0] },
    ]);
    const p1 = await person(fixture, 'Žena');
    const p2 = await person(fixture, 'Nechci uvést');
    const p3 = await person(fixture, 'Muž');
    const p4 = await person(fixture, null);

    const first = await evaluate(fixture);
    expect(proposal(first).suitable).toEqual([p1.id, p3.id]);
    expect(reasons(first)).toEqual({ [p2.id]: 'R', [p4.id]: 'R' });

    await prisma.accommodationManualValue.create({
      data: {
        registrationId: p2.id,
        eventId: fixture.event.id,
        value: 'Žena',
        basedOnAnswer: 'Nechci uvést',
        reason: 'domluva s účastníkem',
        createdById: fixture.ownerId,
      },
    });
    const second = await evaluate(fixture);
    expect(proposal(second).suitable).toEqual([p1.id, p2.id, p3.id]);
    expect(reasons(second)).toEqual({ [p4.id]: 'R' });
    expect(
      second.input.order.find((p) => p.registrationId === p2.id),
    ).toMatchObject({
      answer: 'Nechci uvést',
      manualValue: 'Žena',
      effectiveValue: 'Žena',
    });

    // A new non-determining answer cancels the determination.
    answers.byRegistration.set(p2.id, 'Jiná odpověď');
    const third = await evaluate(fixture);
    expect(reasons(third)[p2.id]).toBe('R');
  });

  it('counts confirmed participants as fixed and never moves them (Př. 6, Př. 7)', async () => {
    const fixture = await setup(
      [
        { baseBeds: 2, termIndexes: [0] },
        { baseBeds: 1, termIndexes: [1] },
      ],
      { terms: 2 },
    );
    await person(fixture, 'Žena', { terms: [1], status: 'confirmed' });
    const p1 = await person(fixture, 'Žena', { terms: [0, 1] });

    const t1 = await evaluate(fixture, 0);
    const t2 = await evaluate(fixture, 1);

    expect(proposal(t1).suitable).toEqual([p1.id]);
    expect(reasons(t2)).toEqual({ [p1.id]: 'A' });
  });

  it('gives N without capacity and keeps a manual order (Př. 8, Př. 9)', async () => {
    const empty = await setup([]);
    const alone = await person(empty, 'Žena');
    expect(reasons(await evaluate(empty))).toEqual({ [alone.id]: 'N' });

    const fixture = await setup([{ baseBeds: 2, termIndexes: [0] }]);
    const [p1, p2, p3] = [
      await person(fixture, 'Žena'),
      await person(fixture, 'Žena'),
      await person(fixture, 'Žena'),
    ];
    await prisma.accommodationTermOrder.create({
      data: {
        termId: fixture.terms[0].id,
        eventId: fixture.event.id,
        registrationIds: [p1.id, p3.id, p2.id],
      },
    });

    const run = await evaluate(fixture);

    expect(run.input.isOrderManual).toBe(true);
    expect(proposal(run).suitable).toEqual([p1.id, p3.id]);
    expect(reasons(run)).toEqual({ [p2.id]: 'A' });
  });

  it('stores a conflict of the confirmed with the people involved (Př. 11)', async () => {
    const fixture = await setup([
      { baseBeds: 2, termIndexes: [0], label: 'R1' },
      { baseBeds: 2, termIndexes: [0], label: 'R2' },
    ]);
    const confirmed = [
      await person(fixture, 'Žena', { status: 'confirmed' }),
      await person(fixture, 'Žena', { status: 'confirmed' }),
      await person(fixture, 'Žena', { status: 'confirmed' }),
      await person(fixture, 'Muž', { status: 'confirmed' }),
    ];

    const conflict = await evaluate(fixture);
    expect(conflict.status).toBe('infeasible');
    expect(proposal(conflict).conflicting?.length).toBeGreaterThan(0);
    expect(
      proposal(conflict).conflicting?.every((id) =>
        confirmed.some((c) => c.id === id),
      ),
    ).toBe(true);

    await prisma.roomTermAvailability.updateMany({
      where: { termId: fixture.terms[0].id, room: { label: 'R1' } },
      data: { extraBeds: 1 },
    });
    expect((await evaluate(fixture)).status).toBe('solved');
  });

  it('evaluates by capacity and order alone without a hard attribute', async () => {
    const fixture = await setup([{ baseBeds: 2, termIndexes: [0] }], {
      gender: false,
    });
    const [p1, p2, p3] = [
      await person(fixture, null),
      await person(fixture, null),
      await person(fixture, null),
    ];

    const run = await evaluate(fixture);

    expect(proposal(run).suitable).toEqual([p1.id, p2.id]);
    expect(reasons(run)).toEqual({ [p3.id]: 'A' });
  });
});

describe('a run', () => {
  it('only proposes: no participation, debt or room changes', async () => {
    const fixture = await setup([{ baseBeds: 2, termIndexes: [0] }]);
    const p1 = await person(fixture, 'Žena');
    const before = await prisma.registrationTerm.findMany({
      where: { registrationId: p1.id },
    });

    const run = await evaluate(fixture);

    expect(proposal(run).suitable).toEqual([p1.id]);
    expect(
      await prisma.registrationTerm.findMany({
        where: { registrationId: p1.id },
      }),
    ).toEqual(before);
    expect(
      await prisma.registration.findUniqueOrThrow({ where: { id: p1.id } }),
    ).toMatchObject({ paymentReminderAt: p1.paymentReminderAt });
  });

  it('is stored with its inputs and order and can never be changed', async () => {
    const fixture = await setup([{ baseBeds: 1, termIndexes: [0] }]);
    const p1 = await person(fixture, 'Žena');

    const run = await evaluate(fixture);
    const stored = await prisma.accommodationRun.findUniqueOrThrow({
      where: { id: run.id },
    });

    expect(stored).toMatchObject({
      termId: fixture.terms[0].id,
      triggeredById: fixture.ownerId,
      solverVersion: SOLVER_VERSION,
      status: 'solved',
    });
    expect(run.input).toMatchObject({
      rules: { hardAttribute: { attribute: 'gender' } },
      rooms: [{ baseBeds: 1, extraBeds: 0 }],
      order: [{ registrationId: p1.id, position: 0, effectiveValue: 'Žena' }],
      isOrderManual: false,
    });
    await expect(
      prisma.accommodationRun.update({
        where: { id: run.id },
        data: { status: 'failed' },
      }),
    ).rejects.toThrow(/immutable/);
    await expect(
      prisma.accommodationRun.delete({ where: { id: run.id } }),
    ).rejects.toThrow(/immutable/);
  });

  it('is not made for a term of another event', async () => {
    const fixture = await setup([{ baseBeds: 1, termIndexes: [0] }]);
    const other = await setup([{ baseBeds: 1, termIndexes: [0] }]);

    expect(
      await service.evaluateTerm(fixture.event.id, other.terms[0].id, {
        triggeredById: null,
      }),
    ).toBeNull();
  });
});

describe('the database', () => {
  it('refuses a determination or an intervention without a reason', async () => {
    const fixture = await setup([{ baseBeds: 1, termIndexes: [0] }]);
    const p1 = await person(fixture, 'Nechci uvést');

    await expect(
      prisma.accommodationManualValue.create({
        data: {
          registrationId: p1.id,
          eventId: fixture.event.id,
          value: 'Žena',
          basedOnAnswer: 'Nechci uvést',
          reason: '  ',
          createdById: fixture.ownerId,
        },
      }),
    ).rejects.toThrow(/accommodation_manual_value_reason_chk/);
    await expect(
      prisma.accommodationIntervention.create({
        data: {
          eventId: fixture.event.id,
          termId: fixture.terms[0].id,
          registrationId: p1.id,
          kind: 'position',
          actorId: fixture.ownerId,
          reason: '',
          before: [],
          after: [],
        },
      }),
    ).rejects.toThrow(/accommodation_intervention_reason_chk/);
  });

  it('refuses a position change for a term of another event', async () => {
    const fixture = await setup([{ baseBeds: 1, termIndexes: [0] }]);
    const other = await setup([{ baseBeds: 1, termIndexes: [0] }]);
    const p1 = await person(fixture, 'Žena');

    await expect(
      prisma.accommodationIntervention.create({
        data: {
          eventId: fixture.event.id,
          termId: other.terms[0].id,
          registrationId: p1.id,
          kind: 'position',
          actorId: fixture.ownerId,
          reason: 'organizační tým',
          before: [],
          after: [],
        },
      }),
    ).rejects.toThrow(/accommodation_intervention_termId_eventId_fkey/);
  });
});
