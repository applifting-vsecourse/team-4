import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { OrderMovesController } from '@/modules/accommodation/controllers/order-moves.controller';
import { RegistrationAccommodationController } from '@/modules/accommodation/controllers/registration-accommodation.controller';
import { TermEvaluationController } from '@/modules/accommodation/controllers/term-evaluation.controller';
import { EvaluationQueueRepository } from '@/modules/accommodation/repositories/evaluation-queue.repository';
import { OrderMovesRepository } from '@/modules/accommodation/repositories/order-moves.repository';
import { RegistrationAccommodationRepository } from '@/modules/accommodation/repositories/registration-accommodation.repository';
import { TermDecisionRepository } from '@/modules/accommodation/repositories/term-decision.repository';
import { TermEvaluationRepository } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { termInputsChanged } from '@/modules/accommodation/repositories/term-inputs';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from '@/modules/accommodation/services/hard-attribute-answers';
import { OrderMovesService } from '@/modules/accommodation/services/order-moves.service';
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

// S3-03 (F39-1, spec v4 §6) through the HTTP API against a real database:
// the organizer places an unconfirmed person right before or after another
// one of the same queue, with a reason. The term order changes, the record is
// immutable, the term's proposal turns stale, and nothing is confirmed or
// owed. A stale or repeated request changes nothing more. The guard is
// replaced: `x-test-user` names the organizer. Needs a migrated Postgres in
// DATABASE_URL: `pnpm backend test:db`.

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
      OrderMovesController,
      RegistrationAccommodationController,
      TermEvaluationController,
    ],
    providers: [
      OrderMovesService,
      OrderMovesRepository,
      TermDecisionRepository,
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

type Gender = 'female' | 'male' | 'other' | 'undisclosed' | null;
type Status = 'pending' | 'waitlisted' | 'confirmed';

type Fixture = CreatedEvent & {
  ownerId: string;
  base: string;
  /** `…/accommodation/terms/:termId` of the term at the index. */
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
    base,
    termPath: (index) =>
      `${base}/accommodation/terms/${created.terms[index].id}`,
  };
};

/** Received at the given minute, in both terms with the same status. */
const register = async (
  f: Fixture,
  gender: Gender,
  minute: number,
  status: Status = 'pending',
): Promise<Registration> => {
  const registration = await createRegistration(prisma, {
    event: f.event,
    terms: f.terms.map((term) => ({ term, status })),
  });
  return prisma.registration.update({
    where: { id: registration.id },
    data: {
      gender,
      receivedAt: new Date(
        `2027-03-01T10:${String(minute).padStart(2, '0')}:00Z`,
      ),
    },
  });
};

const evaluation = (f: Fixture, index = 0): Promise<Call> =>
  call(f.ownerId, 'GET', `${f.termPath(index)}/evaluation`);

const orderOf = async (f: Fixture, index = 0): Promise<string[]> =>
  ((await evaluation(f, index)).body.order as { registrationId: string }[]).map(
    (entry) => entry.registrationId,
  );

const versionOf = async (f: Fixture, index = 0): Promise<number> =>
  (await evaluation(f, index)).body.inputVersion as number;

/** Sends the version the organizer saw: the term's current one. */
const move = async (
  f: Fixture,
  body: {
    registrationId: string;
    targetId: string;
    placement: 'before' | 'after';
    reason?: string;
    expectedVersion?: number;
  },
  index = 0,
): Promise<Call> =>
  call(f.ownerId, 'POST', `${f.termPath(index)}/order/moves`, {
    reason: 'organizační tým',
    expectedVersion: body.expectedVersion ?? (await versionOf(f, index)),
    ...body,
  });

const records = (f: Fixture): Promise<number> =>
  prisma.accommodationIntervention.count({
    where: { eventId: f.event.id, kind: 'position' },
  });

/** The organizer's gender correction (F64), the way the API makes it. */
const correctGender = (
  f: Fixture,
  registration: Registration,
  gender: Gender,
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

describe('moving a person in the queue', () => {
  it('places P3 before P2 in this term only, with an immutable record (Př. 9)', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const p3 = await register(f, 'female', 2, 'waitlisted');
    const before = await versionOf(f);
    const otherBefore = await versionOf(f, 1);

    const response = await move(f, {
      registrationId: p3.id,
      targetId: p2.id,
      placement: 'before',
    });

    expect(response.status).toBe(200);
    expect(response.body.inputVersion).toBe(before + 1);
    expect(
      (
        response.body.order as {
          registrationId: string;
          position: number;
          isMovedByHand: boolean;
        }[]
      ).map((entry) => [
        entry.registrationId,
        entry.position,
        entry.isMovedByHand,
      ]),
    ).toEqual([
      [p1.id, 1, false],
      [p3.id, 2, true],
      [p2.id, 3, false],
    ]);
    // The other term keeps its order and its version.
    expect(await orderOf(f, 1)).toEqual([p1.id, p2.id, p3.id]);
    expect(await versionOf(f, 1)).toBe(otherBefore);

    const record = await prisma.accommodationIntervention.findFirstOrThrow({
      where: { eventId: f.event.id, kind: 'position' },
    });
    expect(record).toMatchObject({
      termId: f.terms[0].id,
      registrationId: p3.id,
      actorId: f.ownerId,
      reason: 'organizační tým',
      before: {
        inputVersion: before,
        queue: 'female',
        order: [p1.id, p2.id, p3.id],
        queueOrder: [p1.id, p2.id, p3.id],
        position: 3,
      },
      after: {
        inputVersion: before + 1,
        targetId: p2.id,
        placement: 'before',
        order: [p1.id, p3.id, p2.id],
        queueOrder: [p1.id, p3.id, p2.id],
        position: 2,
      },
    });
  });

  it('confirms nobody, owes nothing and turns the proposal stale for a new run', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1, 'waitlisted');

    await move(f, {
      registrationId: p2.id,
      targetId: p1.id,
      placement: 'before',
    });

    const terms = await prisma.registrationTerm.findMany({
      where: { eventId: f.event.id },
      select: { status: true },
    });
    expect(terms.map((term) => term.status).sort()).toEqual([
      'pending',
      'pending',
      'waitlisted',
      'waitlisted',
    ]);
    const registrations = await prisma.registration.findMany({
      where: { eventId: f.event.id },
      select: { paymentReminderAt: true },
    });
    expect(registrations.every((r) => r.paymentReminderAt === null)).toBe(true);
    const state = await prisma.accommodationTermState.findUniqueOrThrow({
      where: { termId: f.terms[0].id },
    });
    // The automatic mode evaluates the term again after the debounce.
    expect(state.dueAt).not.toBeNull();
  });

  it('keeps the manual position, and a later registration goes after everyone received before', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const p3 = await register(f, 'female', 2);
    await move(f, {
      registrationId: p1.id,
      targetId: p3.id,
      placement: 'after',
    });

    const p4 = await register(f, 'female', 3);

    expect(await orderOf(f)).toEqual([p2.id, p3.id, p1.id, p4.id]);
  });

  it('changes the term order across queues, next to the target of the same queue', async () => {
    const f = await setup();
    const f1 = await register(f, 'female', 0);
    const m1 = await register(f, 'male', 1);
    const f2 = await register(f, 'female', 2);

    const response = await move(f, {
      registrationId: f2.id,
      targetId: f1.id,
      placement: 'before',
    });

    expect(response.status).toBe(200);
    expect(await orderOf(f)).toEqual([f2.id, f1.id, m1.id]);
  });

  it('moves anyone among everyone without a hard attribute, whatever the gender', async () => {
    const f = await setup({ gender: false });
    const a = await register(f, 'female', 0);
    const b = await register(f, 'male', 1);
    const c = await register(f, null, 2);

    const response = await move(f, {
      registrationId: c.id,
      targetId: a.id,
      placement: 'before',
    });

    expect(response.status).toBe(200);
    expect(await orderOf(f)).toEqual([c.id, a.id, b.id]);
    const record = await prisma.accommodationIntervention.findFirstOrThrow({
      where: { eventId: f.event.id, kind: 'position' },
    });
    expect(record.before).toMatchObject({ queue: null });
  });
});

describe('refusing a move', () => {
  it('refuses to move a confirmed person or to place someone next to them (Př. 9)', async () => {
    const f = await setup();
    const confirmed = await register(f, 'female', 0, 'confirmed');
    const p2 = await register(f, 'female', 1);
    const p3 = await register(f, 'female', 2);

    const moved = await move(f, {
      registrationId: confirmed.id,
      targetId: p3.id,
      placement: 'after',
    });
    const next = await move(f, {
      registrationId: p3.id,
      targetId: confirmed.id,
      placement: 'before',
    });

    expect(moved).toMatchObject({
      status: 400,
      body: { code: 'person_not_movable' },
    });
    expect(next).toMatchObject({
      status: 400,
      body: { code: 'target_invalid' },
    });
    expect(await orderOf(f)).toEqual([p2.id, p3.id]);
    expect(await records(f)).toBe(0);
  });

  it('refuses someone waiting for a manual determination, a target of another queue, and no change', async () => {
    const f = await setup();
    const f1 = await register(f, 'female', 0);
    const f2 = await register(f, 'female', 1);
    const m1 = await register(f, 'male', 2);
    const undisclosed = await register(f, 'undisclosed', 3);

    expect(
      await move(f, {
        registrationId: undisclosed.id,
        targetId: f1.id,
        placement: 'before',
      }),
    ).toMatchObject({ status: 400, body: { code: 'person_not_movable' } });
    expect(
      await move(f, {
        registrationId: m1.id,
        targetId: f1.id,
        placement: 'before',
      }),
    ).toMatchObject({ status: 400, body: { code: 'target_invalid' } });
    expect(
      await move(f, {
        registrationId: f1.id,
        targetId: f2.id,
        placement: 'before',
      }),
    ).toMatchObject({ status: 400, body: { code: 'order_unchanged' } });
    expect(await records(f)).toBe(0);
    expect(await versionOf(f)).toBe(0);
  });

  it('requires a reason and a placement, and takes no position number', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);

    const blank = await move(f, {
      registrationId: p2.id,
      targetId: p1.id,
      placement: 'before',
      reason: '   ',
    });
    const position = await call(
      f.ownerId,
      'POST',
      `${f.termPath(0)}/order/moves`,
      {
        registrationId: p2.id,
        position: 1,
        reason: 'organizační tým',
        expectedVersion: 0,
      },
    );

    expect(blank.status).toBe(400);
    expect(position.status).toBe(400);
    expect(await records(f)).toBe(0);
    expect(await orderOf(f)).toEqual([p1.id, p2.id]);
  });

  it('refuses a move made on an older version, after a change while the form was open', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const seen = await versionOf(f);
    await correctGender(f, p1, 'male');

    const response = await move(f, {
      registrationId: p2.id,
      targetId: p1.id,
      placement: 'before',
      expectedVersion: seen,
    });

    expect(response).toMatchObject({
      status: 409,
      body: { code: 'order_stale' },
    });
    expect(await records(f)).toBe(0);
    expect(await orderOf(f)).toEqual([p1.id, p2.id]);
  });

  it('lets only one of two moves made on the same version through', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const p3 = await register(f, 'female', 2);
    const seen = await versionOf(f);

    const results = await Promise.all([
      move(f, {
        registrationId: p3.id,
        targetId: p1.id,
        placement: 'before',
        expectedVersion: seen,
      }),
      move(f, {
        registrationId: p2.id,
        targetId: p3.id,
        placement: 'after',
        expectedVersion: seen,
      }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await records(f)).toBe(1);
    expect(await versionOf(f)).toBe(seen + 1);
  });
});

describe('locking', () => {
  it('waits for a writer holding the registration, then refuses as stale instead of deadlocking', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const seen = await versionOf(f);
    let moved: Promise<Call> | undefined;

    // Like a determination or a change: the registration first, then the
    // version of its terms.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "registration" WHERE "id" = ${p2.id}::uuid FOR UPDATE`;
      moved = move(f, {
        registrationId: p2.id,
        targetId: p1.id,
        placement: 'before',
        expectedVersion: seen,
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      await termInputsChanged(tx, f.event.id, [f.terms[0].id]);
    });

    expect(await moved).toMatchObject({
      status: 409,
      body: { code: 'order_stale' },
    });
    expect(await records(f)).toBe(0);
  });
});

describe('repeating a move', () => {
  it('records the same request sent again once, and moves nobody twice', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const p3 = await register(f, 'female', 2);
    const seen = await versionOf(f);
    const body = {
      registrationId: p3.id,
      targetId: p1.id,
      placement: 'before' as const,
      expectedVersion: seen,
    };

    const first = await move(f, body);
    const again = await move(f, body);

    expect([first.status, again.status]).toEqual([200, 200]);
    expect(await records(f)).toBe(1);
    expect(await versionOf(f)).toBe(seen + 1);
    expect(await orderOf(f)).toEqual([p3.id, p1.id, p2.id]);
  });

  it('treats another move made on the same version as stale', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const seen = await versionOf(f);
    await move(f, {
      registrationId: p2.id,
      targetId: p1.id,
      placement: 'before',
      expectedVersion: seen,
    });

    const other = await move(f, {
      registrationId: p2.id,
      targetId: p1.id,
      placement: 'before',
      reason: 'jiný důvod',
      expectedVersion: seen,
    });

    expect(other).toMatchObject({ status: 409, body: { code: 'order_stale' } });
    expect(await records(f)).toBe(1);
  });
});

describe('the history of moves', () => {
  it('lists the moves of the term and of the registration, newest first', async () => {
    const f = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const p3 = await register(f, 'female', 2);
    await move(f, {
      registrationId: p3.id,
      targetId: p2.id,
      placement: 'before',
    });
    await move(f, {
      registrationId: p1.id,
      targetId: p2.id,
      placement: 'after',
    });

    const term = await call(f.ownerId, 'GET', `${f.termPath(0)}/order/moves`);
    const detail = await call(
      f.ownerId,
      'GET',
      `${f.base}/registrations/${p3.id}/accommodation`,
    );

    expect(term.status).toBe(200);
    expect(term.body).toMatchObject([
      {
        person: { registrationId: p1.id },
        target: { registrationId: p2.id },
        placement: 'after',
        fromPosition: 1,
        toPosition: 3,
        queue: 'female',
        termLabel: 'T1',
        reason: 'organizační tým',
        actor: { id: f.ownerId },
      },
      {
        person: { registrationId: p3.id, firstName: p3.firstName },
        target: { registrationId: p2.id, firstName: p2.firstName },
        placement: 'before',
        fromPosition: 3,
        toPosition: 2,
        inputVersion: 0,
      },
    ]);
    expect(detail.body.moves).toMatchObject([
      { person: { registrationId: p3.id }, termLabel: 'T1' },
    ]);
    // The other term has no history of its own.
    expect(
      (await call(f.ownerId, 'GET', `${f.termPath(1)}/order/moves`)).body,
    ).toEqual([]);
  });
});

describe('access', () => {
  it('treats a term of another organizer or event like a missing one, writing nothing', async () => {
    const f = await setup();
    const other = await setup();
    const p1 = await register(f, 'female', 0);
    const p2 = await register(f, 'female', 1);
    const body = {
      registrationId: p2.id,
      targetId: p1.id,
      placement: 'before',
      reason: 'organizační tým',
      expectedVersion: 0,
    };

    const foreign = await call(
      other.ownerId,
      'POST',
      `${f.termPath(0)}/order/moves`,
      body,
    );
    const crossed = await call(
      f.ownerId,
      'POST',
      `${f.base}/accommodation/terms/${other.terms[0].id}/order/moves`,
      body,
    );
    const list = await call(
      other.ownerId,
      'GET',
      `${f.termPath(0)}/order/moves`,
    );

    expect([foreign.status, crossed.status, list.status]).toEqual([
      404, 404, 404,
    ]);
    expect(await records(f)).toBe(0);
  });

  it('refuses a person of another event in the term', async () => {
    const f = await setup();
    const other = await setup();
    const p1 = await register(f, 'female', 0);
    const stranger = await register(other, 'female', 1);

    const response = await move(f, {
      registrationId: stranger.id,
      targetId: p1.id,
      placement: 'before',
    });

    expect(response).toMatchObject({
      status: 400,
      body: { code: 'person_not_movable' },
    });
    expect(await records(f)).toBe(0);
  });
});
