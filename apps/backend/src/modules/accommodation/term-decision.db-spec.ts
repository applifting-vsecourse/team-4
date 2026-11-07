import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { RegistrationAccommodationController } from '@/modules/accommodation/controllers/registration-accommodation.controller';
import { TermDecisionController } from '@/modules/accommodation/controllers/term-decision.controller';
import { AccommodationEvaluationRepository } from '@/modules/accommodation/repositories/accommodation-evaluation.repository';
import { RegistrationAccommodationRepository } from '@/modules/accommodation/repositories/registration-accommodation.repository';
import { TermDecisionRepository } from '@/modules/accommodation/repositories/term-decision.repository';
import { TermEvaluationRepository } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { termInputsChanged } from '@/modules/accommodation/repositories/term-inputs';
import { AccommodationEvaluationService } from '@/modules/accommodation/services/accommodation-evaluation.service';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from '@/modules/accommodation/services/hard-attribute-answers';
import { RegistrationAccommodationService } from '@/modules/accommodation/services/registration-accommodation.service';
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

// S3-02 (spec v4 §3, §5) through the HTTP API against a real database: the
// organizer confirms the suitable people of a term's current proposal at
// once, or one person at a time; payments, the audit record and the result
// event follow the saved decision. The guard is replaced: `x-test-user`
// names the organizer. Needs a migrated Postgres in DATABASE_URL:
// `pnpm backend test:db`.

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
    controllers: [TermDecisionController, RegistrationAccommodationController],
    providers: [
      TermDecisionService,
      TermDecisionRepository,
      TermEvaluationRepository,
      AccommodationEvaluationService,
      AccommodationEvaluationRepository,
      RegistrationAccommodationService,
      RegistrationAccommodationRepository,
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
  method: 'GET' | 'POST',
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

type Fixture = CreatedEvent & { ownerId: string; base: string };

const setup = async (
  rooms: RoomInput[] = [{ baseBeds: 2, termIndexes: [0, 1] }],
  { gender = false } = {},
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
        priceMinor: 50_000,
      },
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
  return {
    ...created,
    ownerId: organization.ownerId,
    base: `organizations/${organization.id}/events/${created.event.id}`,
  };
};

/** Registered for both terms, pending in both. */
const register = async (
  f: Fixture,
  gender: 'female' | 'male' | 'other' | 'undisclosed' | null = null,
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

const bumped = (f: Fixture, index = 0): Promise<void> =>
  prisma.$transaction((tx) =>
    termInputsChanged(tx, f.event.id, [f.terms[index].id]),
  );

/** Evaluates the term the way a worker does and returns the run id. */
const evaluate = async (f: Fixture, index = 0): Promise<string> => {
  const run = await evaluation.evaluateTerm(f.event.id, f.terms[index].id, {
    triggeredById: f.ownerId,
  });
  return (run as { id: string }).id;
};

const confirmAll = (
  f: Fixture,
  runId: string,
  { index = 0, key = randomUUID(), user = f.ownerId } = {},
): Promise<Call> =>
  call(
    user,
    'POST',
    `${f.base}/accommodation/terms/${f.terms[index].id}/confirmations`,
    {
      runId,
      submissionKey: key,
    },
  );

const decide = (
  f: Fixture,
  registration: Registration,
  body: Record<string, unknown>,
  { index = 0, key = randomUUID(), user = f.ownerId } = {},
): Promise<Call> =>
  call(
    user,
    'POST',
    `${f.base}/accommodation/terms/${f.terms[index].id}/registrations/${registration.id}/decision`,
    { submissionKey: key, ...body },
  );

const statusIn = async (
  registration: Registration,
  f: Fixture,
  index = 0,
): Promise<string> =>
  (
    await prisma.registrationTerm.findUniqueOrThrow({
      where: {
        registrationId_termId: {
          registrationId: registration.id,
          termId: f.terms[index].id,
        },
      },
    })
  ).status;

describe('Potvrdit všechny vhodné', () => {
  it('confirms the suitable of the term only, with payment, record and result event', async () => {
    const f = await setup();
    const [first, second, third] = [
      await register(f),
      await register(f),
      await register(f),
    ];
    const runId = await evaluate(f);

    const result = await confirmAll(f, runId);

    expect(result.status).toBe(200);
    expect(result.body.isReplay).toBe(false);
    expect(
      result.body.confirmed.map(
        (p: { registrationId: string }) => p.registrationId,
      ),
    ).toEqual(expect.arrayContaining([first.id, second.id]));
    expect(result.body.confirmed).toHaveLength(2);
    // The third stays as they were; the other term is untouched.
    expect(await statusIn(first, f)).toBe('confirmed');
    expect(await statusIn(second, f)).toBe('confirmed');
    expect(await statusIn(third, f)).toBe('pending');
    expect(await statusIn(first, f, 1)).toBe('pending');

    // Payment obligation: the reminder starts with the first confirmation.
    const saved = await prisma.registration.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(saved.paymentReminderAt).not.toBeNull();
    expect(
      (await prisma.registration.findUniqueOrThrow({ where: { id: third.id } }))
        .paymentReminderAt,
    ).toBeNull();

    // One record per person, pointing to the proposal.
    const records = await prisma.accommodationDecision.findMany({
      where: { termId: f.terms[0].id },
    });
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.runId === runId && r.kind === 'bulk')).toBe(
      true,
    );
    expect(records.every((r) => r.actorId === f.ownerId)).toBe(true);

    // One result event per registration, with its own states and payment.
    const events = await prisma.registrationResultEvent.findMany({
      where: { eventId: f.event.id },
    });
    expect(events).toHaveLength(2);
    const payload = events.find((e) => e.registrationId === first.id)
      ?.payload as {
      terms: { status: string }[];
      payment: { amountDueMinor: number; balanceMinor: number };
    };
    expect(payload.terms.map((t) => t.status)).toEqual([
      'confirmed',
      'pending',
    ]);
    expect(payload.payment).toMatchObject({
      amountDueMinor: 100_000,
      balanceMinor: 100_000,
    });
  });

  it('writes nothing again when the same request is repeated', async () => {
    const f = await setup();
    await register(f);
    const runId = await evaluate(f);
    const key = randomUUID();

    const first = await confirmAll(f, runId, { key });
    const again = await confirmAll(f, runId, { key });

    expect(first.status).toBe(200);
    expect(again.status).toBe(200);
    expect(again.body.isReplay).toBe(true);
    expect(
      await prisma.accommodationDecision.count({
        where: { eventId: f.event.id },
      }),
    ).toBe(1);
    expect(
      await prisma.registrationResultEvent.count({
        where: { eventId: f.event.id },
      }),
    ).toBe(1);
  });

  it('rejects the whole batch once the inputs changed, confirming nobody', async () => {
    const f = await setup();
    const person = await register(f);
    const runId = await evaluate(f);
    await register(f); // a new registration after the proposal was shown
    await bumped(f); // the way a saved registration moves the term's inputs

    const result = await confirmAll(f, runId);

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('proposal_stale');
    expect(await statusIn(person, f)).toBe('pending');
    expect(
      await prisma.accommodationDecision.count({
        where: { eventId: f.event.id },
      }),
    ).toBe(0);
  });

  it('turns the confirmed proposal stale for a second confirmation', async () => {
    const f = await setup();
    await register(f);
    const runId = await evaluate(f);

    await confirmAll(f, runId);
    const second = await confirmAll(f, runId);

    expect(second.status).toBe(409);
    expect(second.body.code).toBe('proposal_stale');
  });

  it('never exceeds the capacity when two confirmations race', async () => {
    const f = await setup();
    await register(f);
    await register(f);
    await register(f);
    const runId = await evaluate(f);

    const results = await Promise.all([
      confirmAll(f, runId),
      confirmAll(f, runId),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.registrationTerm.count({
        where: { termId: f.terms[0].id, status: 'confirmed' },
      }),
    ).toBe(2);
  });

  it('has nothing to confirm without a suitable person', async () => {
    const f = await setup([]);
    await register(f);
    const runId = await evaluate(f);

    const result = await confirmAll(f, runId);

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('nothing_to_confirm');
  });

  it('does not confirm a person who needs a determination', async () => {
    const f = await setup(undefined, { gender: true });
    const needs = await register(f, 'undisclosed');
    const suitable = await register(f, 'female');
    const runId = await evaluate(f);

    const result = await confirmAll(f, runId);

    expect(result.status).toBe(200);
    expect(await statusIn(suitable, f)).toBe('confirmed');
    expect(await statusIn(needs, f)).toBe('pending');
  });

  it('is 404 for a foreign organizer, who changes nothing', async () => {
    const f = await setup();
    const person = await register(f);
    const runId = await evaluate(f);
    const stranger = await createOrganization(prisma);

    const result = await confirmAll(f, runId, { user: stranger.ownerId });

    expect(result.status).toBe(404);
    expect(await statusIn(person, f)).toBe('pending');
  });

  it('refuses a run of another term', async () => {
    const f = await setup();
    await register(f);
    const runId = await evaluate(f, 1);

    const result = await confirmAll(f, runId, { index: 0 });

    expect(result.status).toBe(404);
  });
});

describe('deciding one person', () => {
  it('confirms a person and owes only for the confirmed term', async () => {
    const f = await setup();
    const person = await register(f);

    const result = await decide(
      f,
      person,
      { decision: 'confirm' },
      { index: 1 },
    );

    expect(result).toEqual({ status: 200, body: { status: 'confirmed' } });
    expect(await statusIn(person, f, 1)).toBe('confirmed');
    expect(await statusIn(person, f, 0)).toBe('pending');
    const events = await prisma.registrationResultEvent.findMany({
      where: { registrationId: person.id },
    });
    expect(events).toHaveLength(1);
    expect(
      (events[0].payload as { payment: { amountDueMinor: number } }).payment
        .amountDueMinor,
    ).toBe(50_000);
  });

  it('puts a pending person on the waitlist and confirms them later', async () => {
    const f = await setup();
    const person = await register(f);

    expect((await decide(f, person, { decision: 'waitlist' })).status).toBe(
      200,
    );
    expect(await statusIn(person, f)).toBe('waitlisted');
    const again = await decide(f, person, { decision: 'waitlist' });
    expect(again.body.code).toBe('already_waitlisted');
    expect((await decide(f, person, { decision: 'confirm' })).status).toBe(200);
    expect(await statusIn(person, f)).toBe('confirmed');
  });

  it('explains missing capacity without saving anything', async () => {
    const f = await setup([{ baseBeds: 1, termIndexes: [0] }]);
    const first = await register(f);
    const second = await register(f);
    await decide(f, first, { decision: 'confirm' });

    const result = await decide(f, second, { decision: 'confirm' });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('no_capacity');
    expect(await statusIn(second, f)).toBe('pending');
    expect(
      await prisma.accommodationDecision.count({
        where: { registrationId: second.id },
      }),
    ).toBe(0);
  });

  it('writes nothing again on a double click', async () => {
    const f = await setup();
    const person = await register(f);
    const key = randomUUID();

    const results = await Promise.all([
      decide(f, person, { decision: 'confirm' }, { key }),
      decide(f, person, { decision: 'confirm' }, { key }),
    ]);

    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(
      await prisma.accommodationDecision.count({
        where: { registrationId: person.id },
      }),
    ).toBe(1);
    expect(
      await prisma.registrationResultEvent.count({
        where: { registrationId: person.id },
      }),
    ).toBe(1);
  });

  it('needs the determination of a person without a value, saved with the decision', async () => {
    const f = await setup(undefined, { gender: true });
    const person = await register(f, 'undisclosed');

    const without = await decide(f, person, { decision: 'confirm' });
    expect(without.status).toBe(400);
    expect(without.body.code).toBe('determination_required');
    expect(await statusIn(person, f)).toBe('pending');

    const waitlisted = await decide(f, person, { decision: 'waitlist' });
    expect(waitlisted.status).toBe(200);

    const confirmed = await decide(f, person, {
      decision: 'confirm',
      determination: {
        value: 'female',
        answer: 'undisclosed',
        reason: 'Domluva',
      },
    });
    expect(confirmed.status).toBe(200);
    expect(await statusIn(person, f)).toBe('confirmed');
    const manual = await prisma.accommodationManualValue.findUniqueOrThrow({
      where: { registrationId: person.id },
    });
    expect(manual).toMatchObject({ value: 'female', reason: 'Domluva' });
  });

  it('keeps no determination when the capacity refuses the decision', async () => {
    const f = await setup([{ baseBeds: 1, termIndexes: [0] }], {
      gender: true,
    });
    const man = await register(f, 'male');
    const person = await register(f, 'undisclosed');
    await decide(f, man, { decision: 'confirm' });

    const result = await decide(f, person, {
      decision: 'confirm',
      determination: {
        value: 'female',
        answer: 'undisclosed',
        reason: 'Domluva',
      },
    });

    expect(result.status).toBe(409);
    expect(await statusIn(person, f)).toBe('pending');
    expect(
      await prisma.accommodationManualValue.count({
        where: { registrationId: person.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accommodationIntervention.count({
        where: { registrationId: person.id },
      }),
    ).toBe(0);
  });

  it('offers no determination without a hard attribute', async () => {
    const f = await setup();
    const person = await register(f, 'undisclosed');

    const withIt = await decide(f, person, {
      decision: 'confirm',
      determination: { value: 'female', answer: null, reason: 'x' },
    });
    const plain = await decide(f, person, { decision: 'confirm' });

    expect(withIt.status).toBe(409);
    expect(withIt.body.code).toBe('no_hard_attribute');
    expect(plain.status).toBe(200);
  });

  it('cannot decide an already confirmed person or a foreign registration', async () => {
    const f = await setup();
    const person = await register(f);
    await decide(f, person, { decision: 'confirm' });
    const stranger = await createOrganization(prisma);

    const confirmed = await decide(f, person, { decision: 'waitlist' });
    const foreign = await decide(
      f,
      person,
      { decision: 'confirm' },
      { user: stranger.ownerId },
    );

    expect(confirmed.body.code).toBe('not_undecided');
    expect(foreign.status).toBe(404);
  });

  it('makes a stale proposal of the term out of any decision', async () => {
    const f = await setup();
    const [first] = [await register(f), await register(f)];
    const runId = await evaluate(f);

    await decide(f, first, { decision: 'waitlist' });

    expect((await confirmAll(f, runId)).body.code).toBe('proposal_stale');
  });
});

describe('the history of a registration', () => {
  it('lists every decision with author, term, states and the proposal used', async () => {
    const f = await setup();
    const person = await register(f);
    const other = await register(f);
    await decide(f, other, { decision: 'waitlist' }, { index: 1 });
    const runId = await evaluate(f);
    await confirmAll(f, runId);

    const shown = await call(
      f.ownerId,
      'GET',
      `${f.base}/registrations/${person.id}/accommodation`,
    );

    expect(shown.status).toBe(200);
    expect(shown.body.decisions).toHaveLength(1);
    expect(shown.body.decisions[0]).toMatchObject({
      kind: 'bulk',
      termLabel: 'T1',
      from: 'pending',
      to: 'confirmed',
      batchSize: 2,
      run: { id: runId },
      actor: { id: f.ownerId },
    });
  });

  it('cannot be edited or deleted', async () => {
    const f = await setup();
    const person = await register(f);
    await decide(f, person, { decision: 'confirm' });

    await expect(
      prisma.accommodationDecision.updateMany({
        where: { registrationId: person.id },
        data: { toStatus: 'waitlisted' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.accommodationDecision.deleteMany({
        where: { registrationId: person.id },
      }),
    ).rejects.toThrow();
  });
});
