import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { AccommodationRulesController } from '@/modules/accommodation/controllers/accommodation-rules.controller';
import { TermDecisionController } from '@/modules/accommodation/controllers/term-decision.controller';
import { AccommodationEvaluationRepository } from '@/modules/accommodation/repositories/accommodation-evaluation.repository';
import { AccommodationRulesRepository } from '@/modules/accommodation/repositories/accommodation-rules.repository';
import { OrderMovesRepository } from '@/modules/accommodation/repositories/order-moves.repository';
import { RegistrationAccommodationRepository } from '@/modules/accommodation/repositories/registration-accommodation.repository';
import { TermDecisionRepository } from '@/modules/accommodation/repositories/term-decision.repository';
import { TermEvaluationRepository } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { AccommodationEvaluationService } from '@/modules/accommodation/services/accommodation-evaluation.service';
import { AccommodationRulesService } from '@/modules/accommodation/services/accommodation-rules.service';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from '@/modules/accommodation/services/hard-attribute-answers';
import { TermDecisionService } from '@/modules/accommodation/services/term-decision.service';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createRegistration,
  RoomInput,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// #384 and #389 through the HTTP API against a real database: choosing none
// or one hard attribute, ranking the soft preferences of the room proposal,
// what a change makes stale, and the story's verification case (rooms of 1
// and 15 beds) through the evaluation and the bulk confirmation. The guard is replaced: `x-test-user` names the organizer.
// Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

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
let evaluation: AccommodationEvaluationService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [AccommodationRulesController, TermDecisionController],
    providers: [
      AccommodationRulesService,
      AccommodationRulesRepository,
      TermDecisionService,
      TermDecisionRepository,
      OrderMovesRepository,
      RegistrationAccommodationRepository,
      TermEvaluationRepository,
      AccommodationEvaluationService,
      AccommodationEvaluationRepository,
      {
        provide: HardAttributeAnswers,
        useClass: RegistrationHardAttributeAnswers,
      },
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
  evaluation = app.get(AccommodationEvaluationService);
});

afterAll(() => app.close());

type Call = { status: number; body: ReturnType<typeof JSON.parse> };

const call = async (
  user: string,
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-test-user': user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

type Fixture = CreatedEvent & { ownerId: string; base: string; path: string };

const setup = async (
  rooms: RoomInput[] = [{ baseBeds: 2, termIndexes: [0, 1] }],
  mode: 'automatic' | 'manual' = 'automatic',
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
    data: { accommodationEvaluationMode: mode },
  });
  const base = `organizations/${organization.id}/events/${created.event.id}`;
  return {
    ...created,
    ownerId: organization.ownerId,
    base,
    path: `${base}/accommodation/hard-attribute`,
  };
};

const choose = (f: Fixture, hardAttribute: unknown): Promise<Call> =>
  call(f.ownerId, 'PUT', f.path, { hardAttribute });

const versions = async (f: Fixture): Promise<number[]> => {
  const states = await prisma.accommodationTermState.findMany({
    where: { eventId: f.event.id },
  });
  return f.terms.map(
    (term) => states.find((s) => s.termId === term.id)?.inputVersion ?? 0,
  );
};

const register = async (
  f: Fixture,
  gender: 'female' | 'male' | 'undisclosed',
  status: 'pending' | 'confirmed' = 'pending',
): Promise<Registration> => {
  const registration = await createRegistration(prisma, {
    event: f.event,
    terms: [{ term: f.terms[0], status }],
  });
  return prisma.registration.update({
    where: { id: registration.id },
    data: { gender },
  });
};

const GENDER_OPTION = {
  attribute: 'gender',
  label: 'Pohlaví',
  values: [
    { value: 'female', label: 'Žena' },
    { value: 'male', label: 'Muž' },
    { value: 'other', label: 'Jiná odpověď' },
    { value: 'undisclosed', label: 'Nechci uvést' },
  ],
  defaultNonDeterminingValues: ['other', 'undisclosed'],
  defaultNeutralValues: ['other', 'undisclosed'],
};

describe('choosing the hard attribute', () => {
  it('is none by default and offers the gender preset', async () => {
    const f = await setup();

    expect(await call(f.ownerId, 'GET', f.path)).toEqual({
      status: 200,
      body: {
        hardAttribute: null,
        nonDeterminingValues: [],
        options: [GENDER_OPTION],
      },
    });
  });

  it('keeps the choice per event and makes every term stale only on a change', async () => {
    const f = await setup();
    const other = await setup();

    expect(await choose(f, 'gender')).toEqual({
      status: 200,
      body: {
        hardAttribute: 'gender',
        nonDeterminingValues: ['other', 'undisclosed'],
        options: [GENDER_OPTION],
      },
    });
    expect((await call(f.ownerId, 'GET', f.path)).body.hardAttribute).toBe(
      'gender',
    );
    expect(
      await prisma.accommodationRules.findUnique({
        where: { eventId: f.event.id },
      }),
    ).toMatchObject({
      hardAttribute: 'gender',
      nonDeterminingValues: ['other', 'undisclosed'],
    });
    expect(await versions(f)).toEqual([1, 1]);
    // In the automatic mode every term is evaluated again after 10 s.
    const states = await prisma.accommodationTermState.findMany({
      where: { eventId: f.event.id },
    });
    expect(states.every((s) => s.dueAt !== null)).toBe(true);
    expect(
      (await call(other.ownerId, 'GET', other.path)).body.hardAttribute,
    ).toBeNull();
    expect(await versions(other)).toEqual([0, 0]);

    // The same choice again changes nothing.
    await choose(f, 'gender');
    expect(await versions(f)).toEqual([1, 1]);

    expect((await choose(f, null)).body.hardAttribute).toBeNull();
    expect(
      await prisma.accommodationRules.findUnique({
        where: { eventId: f.event.id },
      }),
    ).toMatchObject({ hardAttribute: null, nonDeterminingValues: [] });
    expect(await versions(f)).toEqual([2, 2]);
  });

  it('makes the previous proposal stale, so it confirms nobody', async () => {
    const f = await setup([{ baseBeds: 2, termIndexes: [0] }], 'manual');
    await register(f, 'female');
    await register(f, 'male');
    const run = await evaluation.evaluateTerm(f.event.id, f.terms[0].id, {
      triggeredById: f.ownerId,
    });

    await choose(f, 'gender');
    const refused = await call(
      f.ownerId,
      'POST',
      `${f.base}/accommodation/terms/${f.terms[0].id}/confirmations`,
      { runId: run!.id, submissionKey: randomUUID() },
    );

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('proposal_stale');
    expect(
      await prisma.registrationTerm.count({
        where: { eventId: f.event.id, status: 'confirmed' },
      }),
    ).toBe(0);
  });

  it('resets values that differ from the preset when gender is saved again', async () => {
    const f = await setup();
    await prisma.accommodationRules.create({
      data: {
        eventId: f.event.id,
        hardAttribute: 'gender',
        nonDeterminingValues: ['undisclosed'],
      },
    });

    await choose(f, 'gender');

    expect(
      await prisma.accommodationRules.findUnique({
        where: { eventId: f.event.id },
      }),
    ).toMatchObject({ nonDeterminingValues: ['other', 'undisclosed'] });
    expect(await versions(f)).toEqual([1, 1]);
  });

  it('keeps soft preferences and determinations when switched off and on', async () => {
    const f = await setup();
    await prisma.accommodationRules.create({
      data: {
        eventId: f.event.id,
        hardAttribute: 'gender',
        nonDeterminingValues: ['other', 'undisclosed'],
        softAttributes: ['roommate-wishes'],
      },
    });
    const person = await register(f, 'undisclosed');
    await prisma.accommodationManualValue.create({
      data: {
        registrationId: person.id,
        eventId: f.event.id,
        attribute: 'gender',
        value: 'female',
        basedOnAnswer: 'undisclosed',
        reason: 'Domluveno telefonicky',
        createdById: f.ownerId,
      },
    });

    await choose(f, null);
    await choose(f, 'gender');

    expect(
      await prisma.accommodationRules.findUnique({
        where: { eventId: f.event.id },
      }),
    ).toMatchObject({ softAttributes: ['roommate-wishes'] });
    expect(
      await prisma.accommodationManualValue.count({
        where: { registrationId: person.id },
      }),
    ).toBe(1);
  });

  it('refuses anything but an option or none, and saves nothing', async () => {
    const f = await setup();

    for (const body of [
      { hardAttribute: 'shoe-size' },
      {},
      { hardAttribute: 1 },
    ]) {
      expect((await call(f.ownerId, 'PUT', f.path, body)).status).toBe(400);
    }
    expect(
      (
        await call(f.ownerId, 'PUT', f.path, {
          hardAttribute: 'gender',
          extra: true,
        })
      ).status,
    ).toBe(400);
    expect(
      (await call(f.ownerId, 'GET', f.path)).body.hardAttribute,
    ).toBeNull();
    expect(await versions(f)).toEqual([0, 0]);
  });

  it('treats a foreign event like a missing one', async () => {
    const f = await setup();
    const stranger = await setup();
    const strangersOrganization = stranger.base.split('/events/')[0];
    const foreign = `${strangersOrganization}/events/${f.event.id}/accommodation/hard-attribute`;

    expect((await call(stranger.ownerId, 'GET', f.path)).status).toBe(404);
    expect(
      (await choose({ ...f, ownerId: stranger.ownerId }, 'gender')).status,
    ).toBe(404);
    expect((await call(stranger.ownerId, 'GET', foreign)).status).toBe(404);
    expect(await versions(f)).toEqual([0, 0]);
  });
});

const layoutVersions = async (f: Fixture): Promise<number[]> => {
  const states = await prisma.accommodationTermState.findMany({
    where: { eventId: f.event.id },
  });
  return f.terms.map(
    (term) => states.find((s) => s.termId === term.id)?.layoutVersion ?? 0,
  );
};

const preferencesPath = (f: Fixture): string =>
  `${f.base}/accommodation/room-proposal-preferences`;

const rank = (f: Fixture, preferences: unknown): Promise<Call> =>
  call(f.ownerId, 'PUT', preferencesPath(f), { preferences });

const SOFT_GENDER = GENDER_OPTION;

describe('the soft preferences of the room proposal (#389)', () => {
  it('ranks only "Přání" for a new event and offers gender', async () => {
    const f = await setup();

    expect(await call(f.ownerId, 'GET', preferencesPath(f))).toEqual({
      status: 200,
      body: {
        preferences: [{ id: 'roommate-wishes' }],
        wishes: 'roommate-wishes',
        attributes: [SOFT_GENDER],
      },
    });
  });

  it('keeps the order and neutral answers per event and makes only the room proposals stale', async () => {
    const f = await setup();
    const other = await setup();
    await prisma.event.update({
      where: { id: f.event.id },
      data: { isRoomProposalAutomatic: true },
    });
    const list = [
      { id: 'gender', neutralValues: ['other', 'undisclosed'] },
      { id: 'roommate-wishes' },
    ];

    expect(await rank(f, list)).toEqual({
      status: 200,
      body: {
        preferences: list,
        wishes: 'roommate-wishes',
        attributes: [SOFT_GENDER],
      },
    });
    expect(
      (await call(f.ownerId, 'GET', preferencesPath(f))).body,
    ).toMatchObject({ preferences: list });
    expect(
      await prisma.accommodationRules.findUnique({
        where: { eventId: f.event.id },
      }),
    ).toMatchObject({
      hardAttribute: null,
      softAttributes: ['gender', 'roommate-wishes'],
      softNeutralValues: { gender: ['other', 'undisclosed'] },
    });
    // Every room proposal is stale and due again 10 s later; the evaluation
    // of participation is not (spec §7.1).
    expect(await layoutVersions(f)).toEqual([1, 1]);
    expect(await versions(f)).toEqual([0, 0]);
    const states = await prisma.accommodationTermState.findMany({
      where: { eventId: f.event.id },
    });
    expect(
      states.every((s) => s.proposalDueAt !== null && s.dueAt === null),
    ).toBe(true);
    expect(await layoutVersions(other)).toEqual([0, 0]);

    // The same list again, neutral answers in another order, changes nothing.
    await rank(f, [
      { id: 'gender', neutralValues: ['undisclosed', 'other'] },
      { id: 'roommate-wishes' },
    ]);
    expect(await layoutVersions(f)).toEqual([1, 1]);

    // An empty list is allowed: the proposal skips the soft preferences.
    expect((await rank(f, [])).body.preferences).toEqual([]);
    expect(await layoutVersions(f)).toEqual([2, 2]);
  });

  it('refuses an unknown, repeated or malformed item and saves nothing', async () => {
    const f = await setup();

    for (const preferences of [
      [{ id: 'shoe-size', neutralValues: [] }],
      [{ id: 'roommate-wishes' }, { id: 'roommate-wishes' }],
      [{ id: 'gender', neutralValues: ['tall'] }],
      [{ id: 'gender', neutralValues: ['other', 'other'] }],
      [{ id: 'roommate-wishes', neutralValues: ['other'] }],
      [{ id: 1 }],
      'gender',
    ]) {
      expect((await rank(f, preferences)).status).toBe(400);
    }
    expect((await call(f.ownerId, 'PUT', preferencesPath(f), {})).status).toBe(
      400,
    );
    expect(
      (await call(f.ownerId, 'GET', preferencesPath(f))).body.preferences,
    ).toEqual([{ id: 'roommate-wishes' }]);
    expect(await layoutVersions(f)).toEqual([0, 0]);
  });

  it('never ranks the hard attribute; choosing it removes it from the list', async () => {
    const f = await setup();
    await rank(f, [
      { id: 'roommate-wishes' },
      { id: 'gender', neutralValues: ['other'] },
    ]);
    expect(await layoutVersions(f)).toEqual([1, 1]);

    // Gender becomes the hard attribute: it leaves the soft list, and the
    // room proposals are stale as well as the evaluations.
    await choose(f, 'gender');
    expect(await call(f.ownerId, 'GET', preferencesPath(f))).toEqual({
      status: 200,
      body: {
        preferences: [{ id: 'roommate-wishes' }],
        wishes: 'roommate-wishes',
        attributes: [],
      },
    });
    expect(
      await prisma.accommodationRules.findUnique({
        where: { eventId: f.event.id },
      }),
    ).toMatchObject({ softNeutralValues: {} });
    expect(await layoutVersions(f)).toEqual([2, 2]);
    expect(await versions(f)).toEqual([1, 1]);

    const refused = await rank(f, [{ id: 'gender', neutralValues: [] }]);
    expect(refused).toMatchObject({
      status: 409,
      body: { message: 'Tvrdé pravidlo nelze přidat mezi měkké preference.' },
    });
    expect(await layoutVersions(f)).toEqual([2, 2]);
  });

  it('treats a foreign event like a missing one', async () => {
    const f = await setup();
    const stranger = await setup();

    expect(
      (await call(stranger.ownerId, 'GET', preferencesPath(f))).status,
    ).toBe(404);
    expect((await rank({ ...f, ownerId: stranger.ownerId }, [])).status).toBe(
      404,
    );
    expect(await layoutVersions(f)).toEqual([0, 0]);
  });
});

describe('the verification case (rooms of 1 and 15 beds)', () => {
  // 2 women and 13 men, one man already confirmed.
  const people = async (f: Fixture): Promise<void> => {
    await register(f, 'male', 'confirmed');
    for (let i = 0; i < 2; i++) await register(f, 'female');
    for (let i = 0; i < 12; i++) await register(f, 'male');
  };
  const rooms: RoomInput[] = [
    { baseBeds: 1, termIndexes: [0] },
    { baseBeds: 15, termIndexes: [0] },
  ];

  const confirmProposal = async (f: Fixture): Promise<Call> => {
    const run = await evaluation.evaluateTerm(f.event.id, f.terms[0].id, {
      triggeredById: f.ownerId,
    });
    return call(
      f.ownerId,
      'POST',
      `${f.base}/accommodation/terms/${f.terms[0].id}/confirmations`,
      { runId: run!.id, submissionKey: randomUUID() },
    );
  };

  it('offers at most 13 more people with gender, and bulk confirmation keeps to it', async () => {
    const f = await setup(rooms, 'manual');
    await people(f);
    await choose(f, 'gender');

    const confirmed = await confirmProposal(f);

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.confirmed).toHaveLength(13);
    const byGender = await prisma.registration.groupBy({
      by: ['gender'],
      where: { eventId: f.event.id, terms: { some: { status: 'confirmed' } } },
      _count: true,
    });
    // The men fill the 15 beds; one woman takes the single room.
    expect(
      Object.fromEntries(byGender.map((g) => [g.gender, g._count])),
    ).toEqual({ male: 13, female: 1 });
  });

  it('fits everyone without a hard attribute', async () => {
    const f = await setup(rooms, 'manual');
    await people(f);

    const confirmed = await confirmProposal(f);

    expect(confirmed.body.confirmed).toHaveLength(14);
  });
});
