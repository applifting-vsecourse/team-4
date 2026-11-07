import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { RegistrationAccommodationController } from '@/modules/accommodation/controllers/registration-accommodation.controller';
import { TermEvaluationController } from '@/modules/accommodation/controllers/term-evaluation.controller';
import { EvaluationQueueRepository } from '@/modules/accommodation/repositories/evaluation-queue.repository';
import { RegistrationAccommodationRepository } from '@/modules/accommodation/repositories/registration-accommodation.repository';
import { TermEvaluationRepository } from '@/modules/accommodation/repositories/term-evaluation.repository';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from '@/modules/accommodation/services/hard-attribute-answers';
import { RegistrationAccommodationService } from '@/modules/accommodation/services/registration-accommodation.service';
import { TermEvaluationService } from '@/modules/accommodation/services/term-evaluation.service';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

process.env.ACCOMMODATION_WORKER_INTERVAL_MS = '0';

// S3-01 (spec v4 §4) through the HTTP API against a real database: the
// organizer determines the effective value of a participant whose answer
// does not place them, with a reason and an immutable record; the answer
// stays; every term of the registration turns stale; a changed answer
// cancels the determination. The guard is replaced: `x-test-user` names the
// organizer. Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

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
      RegistrationAccommodationController,
      TermEvaluationController,
    ],
    providers: [
      RegistrationAccommodationService,
      RegistrationAccommodationRepository,
      EventRegistrationsRepository,
      TermEvaluationService,
      TermEvaluationRepository,
      EvaluationQueueRepository,
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
});

afterAll(() => app.close());

type Call = { status: number; body: ReturnType<typeof JSON.parse> };

const call = async (
  user: string,
  method: 'GET' | 'PUT',
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

type Fixture = CreatedEvent & {
  ownerId: string;
  /** `…/registrations/:id/accommodation` of a registration. */
  path: (registration: Registration) => string;
  termPath: (index: number) => string;
};

const setup = async ({ gender = true } = {}): Promise<Fixture> => {
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
    rooms: [{ baseBeds: 2, termIndexes: [0, 1] }],
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
  const base = `organizations/${organization.id}/events/${created.event.id}`;
  return {
    ...created,
    ownerId: organization.ownerId,
    path: (registration) =>
      `${base}/registrations/${registration.id}/accommodation`,
    termPath: (index) =>
      `${base}/accommodation/terms/${created.terms[index].id}/evaluation`,
  };
};

const register = async (
  f: Fixture,
  gender: 'female' | 'male' | 'other' | 'undisclosed' | null,
): Promise<Registration> => {
  const registration = await createRegistration(prisma, {
    event: f.event,
    terms: f.terms.map((term) => ({ term, status: 'pending' as const })),
  });
  return prisma.registration.update({
    where: { id: registration.id },
    data: { gender },
  });
};

/** Sends the answer the organizer saw: the registration's current one. */
const determine = async (
  f: Fixture,
  registration: Registration,
  body: Record<string, unknown>,
): Promise<Call> => {
  const { gender } = await prisma.registration.findUniqueOrThrow({
    where: { id: registration.id },
    select: { gender: true },
  });
  return call(f.ownerId, 'PUT', `${f.path(registration)}/determination`, {
    answer: gender,
    ...body,
  });
};

/** The organizer's gender correction (F64), the way the API makes it. */
const correctGender = (
  f: Fixture,
  registration: Registration,
  gender: 'female' | 'male' | 'other' | 'undisclosed' | null,
): Promise<unknown> =>
  app.get(EventRegistrationsRepository).updateGender(
    {
      organizationId: f.event.organizationId,
      ownerId: f.ownerId,
      eventId: f.event.id,
    },
    registration.id,
    { gender, genderOther: null },
  );

const versions = async (f: Fixture): Promise<number[]> =>
  Promise.all(
    f.terms.map(
      async (term) =>
        (
          await prisma.accommodationTermState.findUnique({
            where: { termId: term.id },
          })
        )?.inputVersion ?? 0,
    ),
  );

describe('reading the accommodation of a registration', () => {
  it('offers the determining values to someone whose answer does not place them', async () => {
    const f = await setup();
    const registration = await register(f, 'undisclosed');

    const shown = await call(f.ownerId, 'GET', f.path(registration));

    expect(shown).toEqual({
      status: 200,
      body: {
        hardAttribute: {
          attribute: 'gender',
          nonDeterminingValues: ['other', 'undisclosed'],
          determiningValues: ['female', 'male'],
        },
        answer: 'undisclosed',
        determination: null,
        effectiveValue: null,
        needsDetermination: true,
        history: [],
      },
    });
  });

  it('needs nothing without a hard attribute, whatever the answer', async () => {
    const f = await setup({ gender: false });
    const registration = await register(f, 'undisclosed');

    const shown = await call(f.ownerId, 'GET', f.path(registration));

    expect(shown.body).toMatchObject({
      hardAttribute: null,
      answer: null,
      needsDetermination: false,
    });
  });
});

describe('determining the effective value', () => {
  it('applies to every term, keeps the answer and records who, when and why', async () => {
    const f = await setup();
    const registration = await register(f, 'undisclosed');

    const saved = await determine(f, registration, {
      value: 'female',
      reason: '  Domluveno telefonicky  ',
    });

    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      answer: 'undisclosed',
      effectiveValue: 'female',
      needsDetermination: false,
      determination: {
        value: 'female',
        basedOnAnswer: 'undisclosed',
        reason: 'Domluveno telefonicky',
        isValid: true,
        createdBy: { id: f.ownerId },
      },
      history: [
        {
          actor: { id: f.ownerId },
          reason: 'Domluveno telefonicky',
          answer: 'undisclosed',
          previousValue: null,
          value: 'female',
        },
      ],
    });
    // The answer itself is never changed.
    expect(
      (
        await prisma.registration.findUniqueOrThrow({
          where: { id: registration.id },
        })
      ).gender,
    ).toBe('undisclosed');
    // Every term of the registration turns stale.
    expect(await versions(f)).toEqual([1, 1]);
    for (const index of [0, 1]) {
      const term = await call(f.ownerId, 'GET', f.termPath(index));
      expect(term.body.order[0]).toMatchObject({
        registrationId: registration.id,
        answer: 'undisclosed',
        determinedValue: 'female',
        effectiveValue: 'female',
      });
      expect(term.body.manualCount).toBe(0);
    }
  });

  it('replaces a determination with a new record, and records nothing for the same value', async () => {
    const f = await setup();
    const registration = await register(f, 'other');
    await determine(f, registration, { value: 'female', reason: 'První' });

    const changed = await determine(f, registration, {
      value: 'male',
      reason: 'Oprava',
    });
    expect(changed.body.history).toMatchObject([
      { previousValue: 'female', value: 'male', reason: 'Oprava' },
      { previousValue: null, value: 'female', reason: 'První' },
    ]);

    const again = await determine(f, registration, {
      value: 'male',
      reason: 'Znovu',
    });
    expect(again.body.history).toHaveLength(2);
    expect(await versions(f)).toEqual([2, 2]);
  });

  it('lapses with any change of the answer, even back to the same one, and the record stays', async () => {
    const f = await setup();
    const registration = await register(f, 'undisclosed');
    await determine(f, registration, { value: 'male', reason: 'Dohoda' });

    await correctGender(f, registration, 'other');
    const changed = await call(f.ownerId, 'GET', f.path(registration));
    expect(changed.body).toMatchObject({
      answer: 'other',
      determination: null,
      effectiveValue: null,
      needsDetermination: true,
      history: [{ value: 'male' }],
    });

    // Back to the answer it was made on: still nobody determined it again.
    await correctGender(f, registration, 'undisclosed');
    const back = await call(f.ownerId, 'GET', f.path(registration));
    expect(back.body).toMatchObject({
      answer: 'undisclosed',
      determination: null,
      needsDetermination: true,
    });
  });

  it('refuses a determination made on an answer that changed meanwhile', async () => {
    const f = await setup();
    const registration = await register(f, 'undisclosed');

    const refused = await determine(f, registration, {
      value: 'female',
      reason: 'Dohoda',
      answer: 'other',
    });

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('answer_changed');
    expect(
      await prisma.accommodationManualValue.count({
        where: { registrationId: registration.id },
      }),
    ).toBe(0);
  });

  it.each([
    [
      'an answer that places the participant',
      'female',
      { value: 'male', reason: 'x' },
      409,
      'determination_not_needed',
    ],
    [
      'a value the rooms cannot carry',
      'undisclosed',
      { value: 'other', reason: 'x' },
      400,
      'value_invalid',
    ],
    [
      'a blank reason',
      'undisclosed',
      { value: 'male', reason: '   ' },
      400,
      undefined,
    ],
    [
      'a reason over 500 characters',
      'undisclosed',
      { value: 'male', reason: 'x'.repeat(501) },
      400,
      undefined,
    ],
  ] as const)(
    'refuses %s and records nothing',
    async (_, gender, body, status, code) => {
      const f = await setup();
      const registration = await register(f, gender);

      const refused = await determine(f, registration, body);

      expect(refused.status).toBe(status);
      if (code) expect(refused.body.code).toBe(code);
      expect(
        await prisma.accommodationIntervention.count({
          where: { registrationId: registration.id },
        }),
      ).toBe(0);
      expect(await versions(f)).toEqual([0, 0]);
    },
  );

  it('refuses a determination without a hard attribute', async () => {
    const f = await setup({ gender: false });
    const registration = await register(f, 'undisclosed');

    const refused = await determine(f, registration, {
      value: 'female',
      reason: 'x',
    });

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('no_hard_attribute');
  });
});

describe('access', () => {
  it('treats a registration of another organizer like a missing one, writing nothing', async () => {
    const mine = await setup();
    const foreign = await setup();
    const registration = await register(foreign, 'undisclosed');
    // The foreign registration under my own event.
    const asMine = mine.path(registration);

    expect(
      (await call(mine.ownerId, 'GET', foreign.path(registration))).status,
    ).toBe(404);
    expect((await call(mine.ownerId, 'GET', asMine)).status).toBe(404);
    expect(
      (
        await call(
          mine.ownerId,
          'PUT',
          `${foreign.path(registration)}/determination`,
          {
            value: 'female',
            reason: 'x',
            answer: 'undisclosed',
          },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(mine.ownerId, 'PUT', `${asMine}/determination`, {
          value: 'female',
          reason: 'x',
          answer: 'undisclosed',
        })
      ).status,
    ).toBe(404);
    expect(
      await prisma.accommodationManualValue.count({
        where: { registrationId: registration.id },
      }),
    ).toBe(0);
  });
});
