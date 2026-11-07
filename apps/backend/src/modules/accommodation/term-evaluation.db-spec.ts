import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  AccommodationTermState,
  Registration,
} from '@/generated/prisma/client';
import { TermEvaluationController } from '@/modules/accommodation/controllers/term-evaluation.controller';
import { AccommodationEvaluationRepository } from '@/modules/accommodation/repositories/accommodation-evaluation.repository';
import { EvaluationQueueRepository } from '@/modules/accommodation/repositories/evaluation-queue.repository';
import { TermEvaluationRepository } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { termInputsChanged } from '@/modules/accommodation/repositories/term-inputs';
import { AccommodationEvaluationService } from '@/modules/accommodation/services/accommodation-evaluation.service';
import { EvaluationWorker } from '@/modules/accommodation/services/evaluation-worker.service';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from '@/modules/accommodation/services/hard-attribute-answers';
import { TermEvaluationService } from '@/modules/accommodation/services/term-evaluation.service';
import { submissionHash } from '@/modules/registrations/domain/registration';
import { RegistrationsRepository } from '@/modules/registrations/repositories/registrations.repository';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createRegistration,
  RoomInput,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

process.env.ACCOMMODATION_WORKER_INTERVAL_MS = '0';

// S3-01 through the HTTP API against a real database: the evaluation mode,
// term input versions with the 10 s debounce, recalculation in either mode,
// one evaluation per term, current and stale proposals, the term view, the
// run evidence and access. The worker's poller is off; tests drain it. The
// guard is replaced: `x-test-user` names the organizer. Needs a migrated
// Postgres in DATABASE_URL: `pnpm backend test:db`.

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
let worker: EvaluationWorker;
let queue: EvaluationQueueRepository;
let evaluation: AccommodationEvaluationService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [TermEvaluationController],
    providers: [
      TermEvaluationService,
      TermEvaluationRepository,
      EvaluationQueueRepository,
      EvaluationWorker,
      AccommodationEvaluationService,
      AccommodationEvaluationRepository,
      RegistrationsRepository,
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
  worker = app.get(EvaluationWorker);
  queue = app.get(EvaluationQueueRepository);
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

type Fixture = CreatedEvent & {
  ownerId: string;
  base: string;
  term: (index?: number) => string;
};

const setup = async (
  rooms: RoomInput[] = [{ baseBeds: 2, termIndexes: [0, 1] }],
  { gender = false, mode = 'automatic' as 'automatic' | 'manual' } = {},
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
  if (gender) {
    await prisma.accommodationRules.create({
      data: {
        eventId: created.event.id,
        hardAttribute: 'gender',
        nonDeterminingValues: ['other', 'undisclosed'],
      },
    });
  }
  const base = `organizations/${organization.id}/events/${created.event.id}/accommodation`;
  return {
    ...created,
    ownerId: organization.ownerId,
    base,
    term: (index = 0) => `${base}/terms/${created.terms[index].id}`,
  };
};

const register = async (
  f: Fixture,
  status: 'pending' | 'confirmed' | 'waitlisted' = 'pending',
  gender: 'female' | 'male' | 'other' | 'undisclosed' | null = null,
): Promise<Registration> => {
  const registration = await createRegistration(prisma, {
    event: f.event,
    terms: [{ term: f.terms[0], status }],
  });
  return gender
    ? prisma.registration.update({
        where: { id: registration.id },
        data: { gender },
      })
    : registration;
};

const changed = (f: Fixture, termIndexes = [0]): Promise<void> =>
  prisma.$transaction((tx) =>
    termInputsChanged(
      tx,
      f.event.id,
      termIndexes.map((index) => f.terms[index].id),
    ),
  );

const stateOf = (
  f: Fixture,
  index = 0,
): Promise<AccommodationTermState | null> =>
  prisma.accommodationTermState.findUnique({
    where: { termId: f.terms[index].id },
  });

/** A scheduled evaluation is due now, as if its 10 s had passed. */
const dueNow = (f: Fixture): Promise<unknown> =>
  prisma.accommodationTermState.updateMany({
    where: { eventId: f.event.id, dueAt: { not: null } },
    data: { dueAt: new Date(Date.now() - 1000) },
  });

const evaluate = async (f: Fixture, index = 0): Promise<Call> => {
  const requested = await call(
    f.ownerId,
    'POST',
    `${f.term(index)}/evaluation`,
  );
  expect(requested.status).toBe(202);
  await worker.drain(f.event.id);
  return call(f.ownerId, 'GET', `${f.term(index)}/evaluation`);
};

describe('evaluation mode', () => {
  it('is automatic by default and keeps what the organizer saved', async () => {
    const f = await setup();
    const path = `${f.base}/evaluation-mode`;

    expect((await call(f.ownerId, 'GET', path)).body).toEqual({
      mode: 'automatic',
    });
    const saved = await call(f.ownerId, 'PUT', path, { mode: 'manual' });
    expect(saved).toEqual({ status: 200, body: { mode: 'manual' } });
    expect((await call(f.ownerId, 'GET', path)).body).toEqual({
      mode: 'manual',
    });
    // The manual mode drops what the automatic one scheduled, not a request.
    await call(f.ownerId, 'PUT', path, { mode: 'automatic' });
    await changed(f);
    await queue.request(f.event.id, f.terms[1].id, f.ownerId);
    await changed(f, [1]);
    await call(f.ownerId, 'PUT', path, { mode: 'manual' });
    expect(await stateOf(f)).toMatchObject({ dueAt: null });
    expect((await stateOf(f, 1))?.dueAt).not.toBeNull();

    expect((await call(f.ownerId, 'PUT', path, { mode: 'later' })).status).toBe(
      400,
    );
  });
});

describe('term input versions (spec v4 §5)', () => {
  it('schedules an automatic evaluation 10 s after the last change, only in that term', async () => {
    const f = await setup();

    const before = Date.now();
    await changed(f);
    const first = await stateOf(f);
    expect(first?.inputVersion).toBe(1);
    expect(first!.dueAt!.getTime()).toBeGreaterThanOrEqual(before + 9_000);

    await changed(f);
    const second = await stateOf(f);
    expect(second?.inputVersion).toBe(2);
    expect(second!.dueAt!.getTime()).toBeGreaterThanOrEqual(
      first!.dueAt!.getTime(),
    );
    expect(await stateOf(f, 1)).toBeNull();
  });

  it('schedules nothing in the manual mode but still makes the proposal stale', async () => {
    const f = await setup(undefined, { mode: 'manual' });
    await changed(f, [0, 1]);
    expect(await stateOf(f)).toMatchObject({ inputVersion: 1, dueAt: null });
    expect(await stateOf(f, 1)).toMatchObject({ inputVersion: 1, dueAt: null });
  });

  it('is bumped by a saved registration in the terms it selects', async () => {
    const f = await setup();
    const input = {
      submissionKey: randomUUID(),
      firstName: 'Jana',
      lastName: 'Nováková',
      email: `jana-${randomUUID().slice(0, 8)}@example.test`,
      phone: '+420777123456',
      termIds: [f.terms[1].id],
    };
    await app
      .get(RegistrationsRepository)
      .submit(f.event.publicId, input, submissionHash(input));

    expect(await stateOf(f)).toBeNull();
    expect(await stateOf(f, 1)).toMatchObject({ inputVersion: 1 });
  });
});

describe('recalculation', () => {
  it('evaluates in the manual mode on request, confirming nobody and owing nothing', async () => {
    const f = await setup(undefined, { mode: 'manual' });
    const a = await register(f);
    await register(f, 'waitlisted');

    const requested = await call(f.ownerId, 'POST', `${f.term()}/evaluation`);
    expect(requested.status).toBe(202);
    expect(requested.body.status).toBe('running');

    await worker.drain(f.event.id);
    const shown = await call(f.ownerId, 'GET', `${f.term()}/evaluation`);
    expect(shown.body).toMatchObject({
      mode: 'manual',
      status: 'current',
      hardAttribute: null,
      queues: [{ value: null, pending: 1, waitlisted: 1, suitable: 2 }],
      capacity: { baseBeds: 2, confirmed: 0, pending: 1, waitlisted: 1 },
      scheduledAt: null,
    });
    expect(shown.body.order.map((p: { result: string }) => p.result)).toEqual([
      'suitable',
      'suitable',
    ]);

    const run = await prisma.accommodationRun.findFirstOrThrow({
      where: { termId: f.terms[0].id },
    });
    expect(run).toMatchObject({ triggeredById: f.ownerId, inputVersion: 0 });
    expect(
      await prisma.registrationTerm.findMany({
        where: { registrationId: a.id },
        select: { status: true },
      }),
    ).toEqual([{ status: 'pending' }]);
    expect(
      (await prisma.registration.findUniqueOrThrow({ where: { id: a.id } }))
        .paymentReminderAt,
    ).toBeNull();
  });

  it('turns stale after a change and current again after the automatic evaluation', async () => {
    const f = await setup();
    await register(f);
    expect((await evaluate(f)).body.status).toBe('current');

    await changed(f);
    const stale = await call(f.ownerId, 'GET', `${f.term()}/evaluation`);
    expect(stale.body).toMatchObject({
      status: 'stale',
      proposalRun: { isCurrent: false },
    });
    expect(stale.body.scheduledAt).not.toBeNull();

    // Not due yet: nothing runs before the 10 s are over.
    await worker.drain(f.event.id);
    expect(
      (await call(f.ownerId, 'GET', `${f.term()}/evaluation`)).body.status,
    ).toBe('stale');

    await dueNow(f);
    await worker.drain(f.event.id);
    const current = await call(f.ownerId, 'GET', `${f.term()}/evaluation`);
    expect(current.body).toMatchObject({
      status: 'current',
      scheduledAt: null,
    });
    const runs = await call(f.ownerId, 'GET', `${f.term()}/runs`);
    expect(runs.body.runs).toHaveLength(2);
    expect(runs.body.runs[0]).toMatchObject({
      triggeredBy: null,
      isCurrent: true,
      inputVersion: 1,
    });
    expect(runs.body.runs[1]).toMatchObject({
      triggeredBy: { id: f.ownerId },
      isCurrent: false,
    });
  });

  it('runs one evaluation per term; a change meanwhile makes its result stale at once', async () => {
    const f = await setup();
    await register(f);
    await queue.request(f.event.id, f.terms[0].id, f.ownerId);

    const [claimed] = await queue.claimDue(5, f.event.id);
    expect(claimed).toMatchObject({ termId: f.terms[0].id, inputVersion: 0 });
    expect(
      (await call(f.ownerId, 'GET', `${f.term()}/evaluation`)).body.status,
    ).toBe('running');

    await changed(f);
    await queue.request(f.event.id, f.terms[0].id, f.ownerId);
    // The next one waits for the running one.
    expect(
      (await queue.claimDue(5, f.event.id)).filter(
        (c) => c.termId === f.terms[0].id,
      ),
    ).toEqual([]);

    await evaluation.evaluateTerm(f.event.id, f.terms[0].id, {
      runId: claimed.runId,
      inputVersion: claimed.inputVersion,
      triggeredById: claimed.triggeredById,
    });
    await queue.release(f.terms[0].id, claimed.runId);
    const after = await call(f.ownerId, 'GET', `${f.term()}/evaluation`);
    // The organizer's new request is already waiting to run.
    expect(after.body.status).toBe('running');
    expect(after.body.proposalRun).toMatchObject({
      id: claimed.runId,
      isCurrent: false,
    });

    await worker.drain(f.event.id);
    expect(
      (await call(f.ownerId, 'GET', `${f.term()}/evaluation`)).body.status,
    ).toBe('current');
  });

  it('cannot deadlock a recalculation against a change holding the term, before its first state row', async () => {
    const f = await setup();
    let recalculation: Promise<void> | undefined;

    // A registration or room change holds the term (FOR UPDATE) when
    // "Přepočítat" arrives; only then does it record its own change.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "event_term" WHERE "id" = ${f.terms[0].id}::uuid FOR UPDATE`;
      recalculation = queue.request(f.event.id, f.terms[0].id, f.ownerId);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await termInputsChanged(tx, f.event.id, [f.terms[0].id]);
    });
    await recalculation;

    expect(await stateOf(f)).toMatchObject({
      inputVersion: 1,
      requestedById: f.ownerId,
    });
  });

  it('never gives the same due term to two claims at once', async () => {
    const f = await setup();
    await queue.request(f.event.id, f.terms[0].id, f.ownerId);

    const claims = await Promise.all([
      queue.claimDue(5, f.event.id),
      queue.claimDue(5, f.event.id),
    ]);

    expect(
      claims.flat().filter((claim) => claim.termId === f.terms[0].id),
    ).toHaveLength(1);
    await worker.drain(f.event.id);
  });

  it('takes an evaluation abandoned by a stopped process again', async () => {
    const f = await setup();
    await queue.request(f.event.id, f.terms[0].id, f.ownerId);
    const [lost] = await queue.claimDue(5, f.event.id);
    await prisma.accommodationTermState.update({
      where: { termId: f.terms[0].id },
      data: { runningSince: new Date(Date.now() - 10 * 60_000) },
    });

    const [again] = await queue.claimDue(5, f.event.id);

    expect(again.termId).toBe(f.terms[0].id);
    expect(again.runId).not.toBe(lost.runId);
    await worker.drain(f.event.id);
  });

  it('keeps the last proposal visible as stale after a failed run', async () => {
    const f = await setup();
    await register(f);
    const ok = await evaluate(f);
    await prisma.accommodationRun.create({
      data: {
        eventId: f.event.id,
        termId: f.terms[0].id,
        status: 'failed',
        solverVersion: 'test',
        input: {},
        error: 'solver crashed',
        inputVersion: 0,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });

    const shown = await call(f.ownerId, 'GET', `${f.term()}/evaluation`);
    expect(shown.body).toMatchObject({
      status: 'failed',
      proposalRun: { id: ok.body.proposalRun.id, isCurrent: false },
    });
  });
});

describe('the term view', () => {
  it('splits the queues by gender and keeps who needs a determination apart', async () => {
    const f = await setup([{ baseBeds: 2, termIndexes: [0] }], {
      gender: true,
    });
    await register(f, 'confirmed', 'female');
    await register(f, 'pending', 'female');
    await register(f, 'pending', 'male');
    await register(f, 'waitlisted', 'undisclosed');

    const shown = await evaluate(f);

    expect(shown.body).toMatchObject({
      status: 'current',
      hardAttribute: {
        attribute: 'gender',
        nonDeterminingValues: ['other', 'undisclosed'],
      },
      manualCount: 1,
      capacity: { baseBeds: 2, confirmed: 1, pending: 2, waitlisted: 1 },
    });
    expect(shown.body.queues.map((q: { value: string }) => q.value)).toEqual([
      'female',
      'male',
    ]);
    expect(
      shown.body.order.map(
        (p: { answer: string; result: string; reason?: string }) => [
          p.answer,
          p.result,
          p.reason,
        ],
      ),
    ).toEqual([
      ['female', 'suitable', undefined],
      // The two women fill the only room.
      ['male', 'unsuitable', 'A'],
      ['undisclosed', 'manual', 'R'],
    ]);
  });

  it('names the confirmed participants of a conflict and shows no proposal', async () => {
    const f = await setup([{ baseBeds: 1, termIndexes: [0] }]);
    const a = await register(f, 'confirmed');
    const b = await register(f, 'confirmed');

    const shown = await evaluate(f);

    expect(shown.body).toMatchObject({
      status: 'infeasible',
      proposalRun: null,
      conflict: { constraint: 'capacity' },
    });
    expect(
      shown.body.conflict.confirmed
        .map((p: { registrationId: string }) => p.registrationId)
        .sort(),
    ).toEqual([a.id, b.id].sort());
  });

  it('shows a term never evaluated as such, with capacity and no proposal', async () => {
    const f = await setup([]);
    await register(f);
    const shown = await call(f.ownerId, 'GET', `${f.term()}/evaluation`);
    expect(shown.body).toMatchObject({
      status: 'none',
      hasRooms: false,
      proposalRun: null,
      capacity: { baseBeds: 0, extraBeds: 0, pending: 1 },
    });
    expect(shown.body.capacity).not.toHaveProperty('proposal');
  });
});

describe('run evidence', () => {
  it('keeps what a run read after the inputs change', async () => {
    const f = await setup();
    const a = await register(f);
    const shown = await evaluate(f);
    const path = `${f.base}/runs/${shown.body.proposalRun.id}`;
    const before = await call(f.ownerId, 'GET', path);

    expect(before.body).toMatchObject({
      termLabel: 'T1',
      solverVersion: 'highs-phase1/1',
      triggeredBy: { id: f.ownerId },
      isCurrent: true,
      rooms: [{ baseBeds: 2, extraBeds: 0 }],
      isOrderManual: false,
      order: [
        {
          registrationId: a.id,
          position: 1,
          result: 'suitable',
          firstName: a.firstName,
        },
      ],
    });

    await prisma.roomTermAvailability.updateMany({
      where: { termId: f.terms[0].id },
      data: { baseBeds: 5 },
    });
    await changed(f);
    await register(f);
    const after = await call(f.ownerId, 'GET', path);
    expect({ ...after.body, isCurrent: true }).toEqual(before.body);
    expect(after.body.isCurrent).toBe(false);
  });
});

describe('access', () => {
  it('treats a foreign event, term or run like a missing one', async () => {
    const mine = await setup();
    const foreign = await setup();
    await register(foreign);
    const run = await evaluate(foreign);
    const runPath = (f: Fixture): string =>
      `${f.base}/runs/${run.body.proposalRun.id as string}`;

    const asMine = (
      method: 'GET' | 'POST' | 'PUT',
      path: string,
      body?: unknown,
    ): Promise<Call> => call(mine.ownerId, method, path, body);
    for (const [method, path, body] of [
      ['GET', `${foreign.base}/evaluation-mode`],
      ['PUT', `${foreign.base}/evaluation-mode`, { mode: 'manual' }],
      ['GET', `${foreign.term()}/evaluation`],
      ['POST', `${foreign.term()}/evaluation`],
      ['GET', `${foreign.term()}/runs`],
      ['GET', runPath(foreign)],
      // Another event's term or run under my own event.
      ['GET', `${mine.base}/terms/${foreign.terms[0].id}/evaluation`],
      ['POST', `${mine.base}/terms/${foreign.terms[0].id}/evaluation`],
      ['GET', runPath(mine)],
    ] as const) {
      expect((await asMine(method, path, body)).status).toBe(404);
    }
    expect(
      (
        await prisma.event.findUniqueOrThrow({
          where: { id: foreign.event.id },
        })
      ).accommodationEvaluationMode,
    ).toBe('automatic');
    expect(
      await prisma.accommodationTermState.findUnique({
        where: { termId: foreign.terms[0].id },
      }),
    ).toMatchObject({ dueAt: null });
  });
});
