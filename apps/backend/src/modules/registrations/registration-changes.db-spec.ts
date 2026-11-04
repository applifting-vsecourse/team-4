import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { ParticipantRegistrationsController } from '@/modules/registrations/controllers/participant-registrations.controller';
import { RegistrationChangesController } from '@/modules/registrations/controllers/registration-changes.controller';
import { ParticipantRegistrationsRepository } from '@/modules/registrations/repositories/participant-registrations.repository';
import { RegistrationChangesRepository } from '@/modules/registrations/repositories/registration-changes.repository';
import { ParticipantRegistrationsService } from '@/modules/registrations/services/participant-registrations.service';
import { RegistrationChangesService } from '@/modules/registrations/services/registration-changes.service';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// F35-2a through the HTTP API against a real database: changing, moving and
// cancelling an own registration directly or through the organizer's approval,
// the capacity re-check, stale proposals, concurrency and access. Both guards
// are replaced: `x-test-account` names the participant and `x-test-user` the
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

jest.mock(
  '@/modules/participant-access/guards/participant-session.guard',
  () => ({
    ParticipantSessionGuard: class {
      canActivate(context: {
        switchToHttp: () => {
          getRequest: () => {
            headers: Record<string, unknown>;
            participant?: { accountId: string; email: string };
          };
        };
      }): boolean {
        const request = context.switchToHttp().getRequest();
        const id = request.headers['x-test-account'];
        if (typeof id !== 'string') return false;
        request.participant = { accountId: id, email: 'x@example.test' };
        return true;
      }
    },
    CurrentParticipant: jest
      .requireActual<typeof import('@nestjs/common')>('@nestjs/common')
      .createParamDecorator(
        (_data: unknown, context: ExecutionContext) =>
          context.switchToHttp().getRequest<{ participant?: unknown }>()
            .participant,
      ),
  }),
);

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [
      ParticipantRegistrationsController,
      RegistrationChangesController,
    ],
    providers: [
      ParticipantRegistrationsService,
      ParticipantRegistrationsRepository,
      RegistrationChangesService,
      RegistrationChangesRepository,
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

const call = async (
  method: 'GET' | 'POST',
  path: string,
  who: { account?: string; user?: string },
  body?: unknown,
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(who.account ? { 'x-test-account': who.account } : {}),
      ...(who.user ? { 'x-test-user': who.user } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
};

const inDays = (days: number): string => {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toISOString().slice(0, 10);
};

const term = (label: string, days: number, priceMinor = 240_000) => ({
  label,
  startDate: inDays(days),
  endDate: inDays(days + 2),
  priceMinor,
});

type Fixture = CreatedEvent & {
  ownerId: string;
  organizationId: string;
};

/** Terms: [0] +5 days, [1] +60, [2] +90, [3] +120; every term has `beds` beds. */
const setup = async (
  approvalDays: number | null,
  beds = 5,
): Promise<Fixture> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [
      term('Turnus 1', 5),
      term('Turnus 2', 60),
      term('Turnus 3', 90, 290_000),
      term('Turnus 4', 120, 290_000),
    ],
    rooms: [{ baseBeds: beds, termIndexes: [0, 1, 2, 3] }],
  });
  await prisma.event.update({
    where: { id: created.event.id },
    data: { changeApprovalDays: approvalDays },
  });
  return {
    ...created,
    ownerId: organization.ownerId,
    organizationId: organization.id,
  };
};

const register = async (
  fixture: Fixture,
  termIndexes: number[],
  status: 'confirmed' | 'waitlisted' = 'confirmed',
): Promise<Registration> =>
  createRegistration(prisma, {
    event: fixture.event,
    terms: termIndexes.map((index) => ({
      term: fixture.terms[index],
      status,
    })),
  });

const own = (registration: Registration) => ({
  account: registration.participantAccountId,
});
const owner = (fixture: Fixture) => ({ user: fixture.ownerId });
const base = (registration: Registration): string =>
  `participant/registrations/${registration.id}`;
const managed = (fixture: Fixture, registration: Registration): string =>
  `organizations/${fixture.organizationId}/events/${fixture.event.id}/registrations/${registration.id}`;

const statuses = async (
  registration: Registration,
): Promise<Record<string, string>> =>
  Object.fromEntries(
    (
      await prisma.registrationTerm.findMany({
        where: { registrationId: registration.id },
        include: { term: true },
      })
    ).map((row) => [row.term.label, row.status]),
  );

const version = async (registration: Registration): Promise<number> =>
  (
    await prisma.registration.findUniqueOrThrow({
      where: { id: registration.id },
    })
  ).version;

/** Reviews and submits the way the form does. */
const submit = async (
  registration: Registration,
  proposal: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Promise<Call> => {
  const preview = await call(
    'POST',
    `${base(registration)}/changes/preview`,
    own(registration),
    { moves: [], cancelledTermIds: [], ...proposal },
  );
  expect(preview.status).toBe(200);
  return call('POST', `${base(registration)}/changes`, own(registration), {
    moves: [],
    cancelledTermIds: [],
    ...proposal,
    expectedVersion: preview.body.version,
    expectsApproval: preview.body.requiresApproval,
    ...overrides,
  });
};

describe('changes without approval', () => {
  it('changes the data and shows it to both sides after a reload', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);

    const result = await submit(registration, { phone: '+420731987654' });

    expect(result.status).toBe(200);
    expect(result.body.outcome).toBe('applied');
    const detail = await call('GET', base(registration), own(registration));
    expect(detail.body.contact).toMatchObject({
      phone: '+420731987654',
      email: registration.email,
    });
    expect(detail.body.version).toBe(1);
    const organizer = await call(
      'GET',
      `${managed(fixture, registration)}/changes`,
      owner(fixture),
    );
    expect(organizer.body.changes[0]).toMatchObject({
      status: 'applied',
      kinds: ['data'],
    });
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: registration.id },
    });
    expect(stored.phone).toBe('+420731987654');
  });

  it('moves to a free term: occupancy, price and payments follow', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [1]);
    await createPayment(prisma, {
      registration,
      recordedById: fixture.ownerId,
      amountMinor: 240_000,
    });

    const result = await submit(registration, {
      moves: [
        {
          fromTermId: fixture.terms[1].id,
          toTermId: fixture.terms[2].id,
          acceptWaitlist: false,
        },
      ],
    });

    expect(result.body.outcome).toBe('applied');
    expect(await statuses(registration)).toEqual({
      'Turnus 2': 'cancelled',
      'Turnus 3': 'confirmed',
    });
    const detail = await call('GET', base(registration), own(registration));
    expect(detail.body).toMatchObject({
      amountDueMinor: 290_000,
      paidMinor: 240_000,
      balanceMinor: 50_000,
      selectedPriceMinor: 290_000,
    });
    expect(detail.body.paymentInstructions.amountMinor).toBe(50_000);
    expect(detail.body.payments).toHaveLength(1);
  });

  it('cancels a term, frees only its bed and keeps an overpayment', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1, 2]);
    await createPayment(prisma, {
      registration,
      recordedById: fixture.ownerId,
      amountMinor: 530_000,
    });

    const result = await submit(registration, {
      cancelledTermIds: [fixture.terms[1].id],
    });

    expect(result.body.outcome).toBe('applied');
    expect(await statuses(registration)).toEqual({
      'Turnus 2': 'cancelled',
      'Turnus 3': 'confirmed',
    });
    const detail = await call('GET', base(registration), own(registration));
    expect(detail.body.balanceMinor).toBe(-240_000);
    expect(detail.body.canChange).toBe(true);
  });

  it('shows a registration with every term cancelled as cancelled, history kept', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1, 2]);

    const result = await submit(registration, {
      cancelledTermIds: [fixture.terms[1].id, fixture.terms[2].id],
    });

    expect(result.body.change.kinds).toEqual(['cancel_all']);
    const detail = await call('GET', base(registration), own(registration));
    expect(detail.body.isCancelled).toBe(true);
    expect(detail.body.canChange).toBe(false);
    expect(detail.body.terms).toHaveLength(2);
    const again = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      { moves: [], cancelledTermIds: [], phone: '+420731987654' },
    );
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('registration_cancelled');
  });

  it('refuses a stale proposal and changes nothing', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    const proposal = { firstName: 'Nová' };
    const preview = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      { moves: [], cancelledTermIds: [], ...proposal },
    );
    await submit(registration, { lastName: 'Jiná' });

    const stale = await call(
      'POST',
      `${base(registration)}/changes`,
      own(registration),
      {
        moves: [],
        cancelledTermIds: [],
        ...proposal,
        expectedVersion: preview.body.version,
        expectsApproval: false,
      },
    );

    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('registration_stale');
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: registration.id },
    });
    expect(stored.firstName).toBe('Test');
    expect(stored.lastName).toBe('Jiná');
  });

  it('rejects an empty change and invalid values', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    const empty = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      { moves: [], cancelledTermIds: [] },
    );
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe('no_change');
    const badPhone = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      { moves: [], cancelledTermIds: [], phone: '123' },
    );
    expect(badPhone.status).toBe(400);
    const email = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      { moves: [], cancelledTermIds: [], email: 'x@example.test' },
    );
    expect(email.status).toBe(400);
  });
});

describe('approval', () => {
  it('files a request that changes nothing until the organizer approves it once', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0, 1]);

    const result = await submit(registration, { phone: '+420731987654' });

    expect(result.body.outcome).toBe('requested');
    expect(result.body.change.status).toBe('pending');
    expect(await version(registration)).toBe(0);
    const detail = await call('GET', base(registration), own(registration));
    expect(detail.body.contact.phone).toBe('+420600000000');
    expect(detail.body.canChange).toBe(false);

    const queue = await call(
      'GET',
      `organizations/${fixture.organizationId}/events/${fixture.event.id}/change-requests`,
      owner(fixture),
    );
    expect(queue.body.changes).toHaveLength(1);
    expect(queue.body.changes[0].summary.values[0]).toMatchObject({
      original: '+420600000000',
      proposed: '+420731987654',
    });

    const path = `${managed(fixture, registration)}/changes/${result.body.change.id}`;
    const approved = await call('POST', `${path}/approve`, owner(fixture));
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('approved');
    expect(await version(registration)).toBe(1);

    const again = await call('POST', `${path}/approve`, owner(fixture));
    expect(again.status).toBe(200);
    expect(await version(registration)).toBe(1);
    const reject = await call('POST', `${path}/reject`, owner(fixture));
    expect(reject.status).toBe(409);
    expect(reject.body.code).toBe('change_already_decided');

    const empty = await call(
      'GET',
      `organizations/${fixture.organizationId}/events/${fixture.event.id}/change-requests`,
      owner(fixture),
    );
    expect(empty.body.changes).toEqual([]);
  });

  it('keeps the registration as it is after a rejection', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0]);
    const result = await submit(registration, {
      cancelledTermIds: [fixture.terms[0].id],
    });
    expect(result.body.outcome).toBe('requested');

    const path = `${managed(fixture, registration)}/changes/${result.body.change.id}`;
    const rejected = await call('POST', `${path}/reject`, owner(fixture));

    expect(rejected.body.status).toBe('rejected');
    expect(await statuses(registration)).toEqual({ 'Turnus 1': 'confirmed' });
    expect(await version(registration)).toBe(0);
    const detail = await call('GET', base(registration), own(registration));
    expect(detail.body.canChange).toBe(true);
    const approveLater = await call('POST', `${path}/approve`, owner(fixture));
    expect(approveLater.status).toBe(409);
  });

  it('does not reserve the target term while the request waits', async () => {
    const fixture = await setup(14, 1);
    const registration = await register(fixture, [0]);
    const result = await submit(registration, {
      moves: [
        {
          fromTermId: fixture.terms[0].id,
          toTermId: fixture.terms[1].id,
          acceptWaitlist: false,
        },
      ],
    });
    expect(result.body.outcome).toBe('requested');
    const rival = await register(fixture, [1]);
    expect(await statuses(rival)).toEqual({ 'Turnus 2': 'confirmed' });

    const path = `${managed(fixture, registration)}/changes/${result.body.change.id}`;
    const approve = await call('POST', `${path}/approve`, owner(fixture));

    expect(approve.status).toBe(409);
    expect(approve.body.code).toBe('waitlist_consent_required');
    expect(await statuses(registration)).toEqual({ 'Turnus 1': 'confirmed' });

    const pending = await call(
      'GET',
      `${managed(fixture, registration)}/changes`,
      owner(fixture),
    );
    expect(pending.body.changes[0].needsParticipantConsent).toBe(true);

    const accepted = await call(
      'POST',
      `${base(registration)}/changes/${result.body.change.id}/accept-waitlist`,
      own(registration),
    );
    expect(accepted.body.needsParticipantConsent).toBe(false);
    const done = await call('POST', `${path}/approve`, owner(fixture));
    expect(done.status).toBe(200);
    expect(await statuses(registration)).toEqual({
      'Turnus 1': 'cancelled',
      'Turnus 2': 'waitlisted',
    });
  });

  it('tells the need for approval apart from what the form confirmed', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [1]);
    const stale = await submit(
      registration,
      { firstName: 'Nová' },
      { expectsApproval: true },
    );
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('approval_changed');
    expect(stale.body.preview.requiresApproval).toBe(false);

    await prisma.event.update({
      where: { id: fixture.event.id },
      data: { changeApprovalDays: 365 },
    });
    const newlyRequired = await call(
      'POST',
      `${base(registration)}/changes`,
      own(registration),
      {
        moves: [],
        cancelledTermIds: [],
        firstName: 'Nová',
        expectedVersion: 0,
        expectsApproval: false,
      },
    );
    expect(newlyRequired.status).toBe(409);
    expect(newlyRequired.body.code).toBe('approval_changed');
    expect(newlyRequired.body.preview.requiresApproval).toBe(true);
    expect(await version(registration)).toBe(0);
  });

  it('allows one waiting request per registration', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0]);
    await submit(registration, { firstName: 'Nová' });

    const second = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      { moves: [], cancelledTermIds: [], lastName: 'Jiná' },
    );

    expect(second.status).toBe(409);
    expect(second.body.code).toBe('change_pending');
  });
});

describe('capacity', () => {
  const moveToFull = async (fixture: Fixture, registration: Registration) => ({
    moves: [
      {
        fromTermId: fixture.terms[1].id,
        toTermId: fixture.terms[2].id,
        acceptWaitlist: false,
      },
    ],
    registration,
  });

  it('asks for consent before a move onto a full term and then loses the place', async () => {
    const fixture = await setup(null, 1);
    await register(fixture, [2]);
    const registration = await register(fixture, [1]);
    const { moves } = await moveToFull(fixture, registration);

    const preview = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      { moves, cancelledTermIds: [] },
    );
    expect(preview.body.moves[0]).toMatchObject({
      resultStatus: 'waitlisted',
      requiresWaitlistConsent: true,
    });

    const refused = await submit(registration, { moves });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('waitlist_consent_required');
    expect(await statuses(registration)).toEqual({ 'Turnus 2': 'confirmed' });

    const accepted = await submit(registration, {
      moves: [{ ...moves[0], acceptWaitlist: true }],
    });
    expect(accepted.body.outcome).toBe('applied');
    expect(await statuses(registration)).toEqual({
      'Turnus 2': 'cancelled',
      'Turnus 3': 'waitlisted',
    });
  });

  it('refuses the move when the term fills up after the review', async () => {
    const fixture = await setup(null, 1);
    const registration = await register(fixture, [1]);
    const { moves } = await moveToFull(fixture, registration);
    const preview = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      { moves, cancelledTermIds: [] },
    );
    expect(preview.body.moves[0].resultStatus).toBe('confirmed');

    await register(fixture, [2]);
    const result = await call(
      'POST',
      `${base(registration)}/changes`,
      own(registration),
      {
        moves,
        cancelledTermIds: [],
        expectedVersion: preview.body.version,
        expectsApproval: false,
      },
    );

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('waitlist_consent_required');
    expect(result.body.preview.moves[0].resultStatus).toBe('waitlisted');
    expect(await statuses(registration)).toEqual({ 'Turnus 2': 'confirmed' });
  });

  it('never exceeds the capacity when two participants move to the last bed', async () => {
    const fixture = await setup(null, 1);
    const a = await register(fixture, [1]);
    const b = await register(fixture, [3]);
    await prisma.roomTermAvailability.updateMany({
      where: { termId: fixture.terms[2].id },
      data: { baseBeds: 1 },
    });
    const move = (from: number) => ({
      moves: [
        {
          fromTermId: fixture.terms[from].id,
          toTermId: fixture.terms[2].id,
          acceptWaitlist: true,
        },
      ],
      cancelledTermIds: [],
      expectedVersion: 0,
      expectsApproval: false,
    });

    await Promise.all([
      call('POST', `${base(a)}/changes`, own(a), move(1)),
      call('POST', `${base(b)}/changes`, own(b), move(3)),
    ]);

    const confirmed = await prisma.registrationTerm.count({
      where: { termId: fixture.terms[2].id, status: 'confirmed' },
    });
    expect(confirmed).toBe(1);
    const waitlisted = await prisma.registrationTerm.count({
      where: { termId: fixture.terms[2].id, status: 'waitlisted' },
    });
    expect(waitlisted).toBe(1);
  });
});

describe('capacity: failures and concurrent approvals', () => {
  it('keeps the original place when the move fails halfway', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    const targetId = fixture.terms[2].id;
    // The release of Turnus 2 is written first; taking Turnus 3 then fails.
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION e2e_fail_move() RETURNS trigger AS $$
      BEGIN
        IF NEW."termId" = '${targetId}' THEN RAISE EXCEPTION 'move failed'; END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER e2e_fail_move BEFORE INSERT ON "registration_term"
       FOR EACH ROW EXECUTE FUNCTION e2e_fail_move()`,
    );
    try {
      const result = await submit(registration, {
        moves: [
          {
            fromTermId: fixture.terms[1].id,
            toTermId: targetId,
            acceptWaitlist: false,
          },
        ],
      });

      expect(result.status).toBe(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER e2e_fail_move ON "registration_term"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION e2e_fail_move()`);
    }

    expect(await statuses(registration)).toEqual({ 'Turnus 2': 'confirmed' });
    expect(await version(registration)).toBe(0);
    expect(
      await prisma.registrationChange.count({
        where: { registrationId: registration.id },
      }),
    ).toBe(0);
  });

  it('keeps the original place and the request when approving would end on the waitlist', async () => {
    const fixture = await setup(14, 1);
    const registration = await register(fixture, [0]);
    const requested = await submit(registration, {
      moves: [
        {
          fromTermId: fixture.terms[0].id,
          toTermId: fixture.terms[1].id,
          acceptWaitlist: false,
        },
      ],
    });
    expect(requested.body.outcome).toBe('requested');
    await register(fixture, [1]);

    const path = `${managed(fixture, registration)}/changes/${requested.body.change.id}`;
    const refused = await call('POST', `${path}/approve`, owner(fixture));

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('waitlist_consent_required');
    expect(refused.body.preview.moves[0].resultStatus).toBe('waitlisted');
    expect(await statuses(registration)).toEqual({ 'Turnus 1': 'confirmed' });
    const stored = await prisma.registrationChange.findUniqueOrThrow({
      where: { id: requested.body.change.id },
    });
    expect(stored.status).toBe('pending');
    expect(await version(registration)).toBe(0);

    // Only the participant's new, explicit consent lets it through.
    await call(
      'POST',
      `${base(registration)}/changes/${requested.body.change.id}/accept-waitlist`,
      own(registration),
    );
    const approved = await call('POST', `${path}/approve`, owner(fixture));
    expect(approved.status).toBe(200);
    expect(await statuses(registration)).toEqual({
      'Turnus 1': 'cancelled',
      'Turnus 2': 'waitlisted',
    });
  });

  it('never exceeds the capacity when two requests for the last bed are approved at once', async () => {
    // Two beds per term: Turnus 2 has one free after a rival took the other.
    const fixture = await setup(14, 2);
    const a = await register(fixture, [0]);
    const b = await register(fixture, [0]);
    await register(fixture, [1]);
    const move = {
      moves: [
        {
          fromTermId: fixture.terms[0].id,
          toTermId: fixture.terms[1].id,
          acceptWaitlist: false,
        },
      ],
    };
    const [askedA, askedB] = [await submit(a, move), await submit(b, move)];
    expect([askedA.body.outcome, askedB.body.outcome]).toEqual([
      'requested',
      'requested',
    ]);

    const results = await Promise.all(
      [
        [a, askedA],
        [b, askedB],
      ].map(([registration, asked]) =>
        call(
          'POST',
          `${managed(fixture, registration as Registration)}/changes/${(asked as Call).body.change.id}/approve`,
          owner(fixture),
        ),
      ),
    );

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.registrationTerm.count({
        where: { termId: fixture.terms[1].id, status: 'confirmed' },
      }),
    ).toBe(2);
    // The refused one keeps its original place and its request.
    const [loser] = results[0].status === 409 ? [a] : [b];
    expect(await statuses(loser)).toEqual({ 'Turnus 1': 'confirmed' });
    expect(
      await prisma.registrationChange.count({
        where: { registrationId: loser.id, status: 'pending' },
      }),
    ).toBe(1);
  });
});

// F64: the voluntary gender answer changes like the other data.
describe('the gender answer', () => {
  const genderOf = async (registration: Registration) =>
    (
      await prisma.registration.findUniqueOrThrow({
        where: { id: registration.id },
        select: { gender: true },
      })
    ).gender;

  it('is set, shown after a reload and cleared back to not answered', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    const before = await call('GET', base(registration), own(registration));
    expect(before.body.contact.gender).toBeNull();

    const set = await submit(registration, { gender: 'undisclosed' });
    expect(set.body.outcome).toBe('applied');
    expect(set.body.change.summary.values).toEqual([
      { field: 'gender', original: null, proposed: 'undisclosed' },
    ]);
    const detail = await call('GET', base(registration), own(registration));
    expect(detail.body.contact.gender).toBe('undisclosed');

    const cleared = await submit(registration, { gender: null });
    expect(cleared.body.change.summary.values).toEqual([
      { field: 'gender', original: 'undisclosed', proposed: null },
    ]);
    expect(await genderOf(registration)).toBeNull();
    expect(await version(registration)).toBe(2);
  });

  it('keeps the original answer until the organizer approves the change', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0, 1]);
    await prisma.registration.update({
      where: { id: registration.id },
      data: { gender: 'female' },
    });

    const requested = await submit(registration, { gender: 'other' });
    expect(requested.body.outcome).toBe('requested');
    expect(await genderOf(registration)).toBe('female');

    const path = `${managed(fixture, registration)}/changes/${requested.body.change.id}`;
    expect(
      (await call('POST', `${path}/approve`, owner(fixture))).body.status,
    ).toBe('approved');
    expect(await genderOf(registration)).toBe('other');
  });

  it('adds own words to "Jiná odpověď" and drops them with another answer', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    const stored = async () =>
      prisma.registration.findUniqueOrThrow({
        where: { id: registration.id },
        select: { gender: true, genderOther: true },
      });

    const set = await submit(registration, {
      gender: 'other',
      genderOther: 'nebinární',
    });
    expect(set.body.change.summary.values).toEqual([
      { field: 'gender', original: null, proposed: 'other' },
      { field: 'genderOther', original: null, proposed: 'nebinární' },
    ]);
    const detail = await call('GET', base(registration), own(registration));
    expect(detail.body.contact).toMatchObject({
      gender: 'other',
      genderOther: 'nebinární',
    });

    await submit(registration, { gender: 'female' });
    expect(await stored()).toEqual({ gender: 'female', genderOther: null });
  });

  it.each([
    ['an unknown value', { gender: 'unknown' }],
    ['several values at once', { gender: ['female', 'male'] }],
    ['own words beside another answer', { gender: 'male', genderOther: 'x' }],
    ['own words beside no stored answer', { genderOther: 'nebinární' }],
  ])('refuses %s and keeps the stored answer', async (_, change) => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    const body = { moves: [], cancelledTermIds: [], ...change };

    const preview = await call(
      'POST',
      `${base(registration)}/changes/preview`,
      own(registration),
      body,
    );
    const submitted = await call(
      'POST',
      `${base(registration)}/changes`,
      own(registration),
      { ...body, expectedVersion: 0, expectsApproval: false },
    );

    expect(preview.status).toBe(400);
    expect(submitted.status).toBe(400);
    expect(await genderOf(registration)).toBeNull();
    expect(await version(registration)).toBe(0);
  });
});

describe('stale requests and null fields', () => {
  it('refuses to approve a request made on an older version of the registration', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0]);
    const requested = await submit(registration, { firstName: 'Nová' });
    expect(requested.body.outcome).toBe('requested');
    // The registration changes through another path while the request waits.
    await prisma.registration.update({
      where: { id: registration.id },
      data: { lastName: 'Jiná', version: { increment: 1 } },
    });

    const path = `${managed(fixture, registration)}/changes/${requested.body.change.id}`;
    const listed = await call(
      'GET',
      `${managed(fixture, registration)}/changes`,
      owner(fixture),
    );
    expect(listed.body.changes[0].isStale).toBe(true);
    const approve = await call('POST', `${path}/approve`, owner(fixture));

    expect(approve.status).toBe(409);
    expect(approve.body.code).toBe('registration_stale');
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: registration.id },
    });
    expect(stored.firstName).toBe('Test');
    expect(stored.lastName).toBe('Jiná');
    expect(
      (
        await prisma.registrationChange.findUniqueOrThrow({
          where: { id: requested.body.change.id },
        })
      ).status,
    ).toBe('pending');
    // It can still be rejected.
    const rejected = await call('POST', `${path}/reject`, owner(fixture));
    expect(rejected.body.status).toBe('rejected');
  });

  it.each(['firstName', 'lastName', 'phone'])(
    'answers 400, not a server error, for %s set to null',
    async (field) => {
      const fixture = await setup(null);
      const registration = await register(fixture, [1]);
      const body = { moves: [], cancelledTermIds: [], [field]: null };

      const preview = await call(
        'POST',
        `${base(registration)}/changes/preview`,
        own(registration),
        body,
      );
      const submitted = await call(
        'POST',
        `${base(registration)}/changes`,
        own(registration),
        { ...body, expectedVersion: 0, expectsApproval: false },
      );

      expect(preview.status).toBe(400);
      expect(submitted.status).toBe(400);
      expect(await version(registration)).toBe(0);
    },
  );
});

describe('access', () => {
  it('hides another participant’s registration and changes', async () => {
    const fixture = await setup(null);
    const mine = await register(fixture, [1]);
    const theirs = await register(fixture, [1]);

    for (const [method, suffix, body] of [
      ['GET', 'changes', undefined],
      [
        'POST',
        'changes/preview',
        { moves: [], cancelledTermIds: [], firstName: 'X' },
      ],
      [
        'POST',
        'changes',
        {
          moves: [],
          cancelledTermIds: [],
          firstName: 'X',
          expectedVersion: 0,
          expectsApproval: false,
        },
      ],
    ] as const) {
      const response = await call(
        method,
        `${base(theirs)}/${suffix}`,
        own(mine),
        body,
      );
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('registration_unavailable');
    }
    expect((await version(theirs)) + (await version(mine))).toBe(0);
  });

  it('keeps another organization from reading or deciding requests', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0]);
    const result = await submit(registration, { firstName: 'Nová' });
    const stranger = await setup(14);

    const path = `${managed(fixture, registration)}/changes/${result.body.change.id}`;
    const attempts = [
      await call('POST', `${path}/approve`, owner(stranger)),
      await call('POST', `${path}/reject`, owner(stranger)),
      await call(
        'GET',
        `${managed(fixture, registration)}/changes`,
        owner(stranger),
      ),
      await call(
        'GET',
        `organizations/${fixture.organizationId}/events/${fixture.event.id}/change-requests`,
        owner(stranger),
      ),
    ];

    for (const attempt of attempts) expect(attempt.status).toBe(404);
    const unchanged = await prisma.registrationChange.findUniqueOrThrow({
      where: { id: result.body.change.id },
    });
    expect(unchanged.status).toBe('pending');
  });

  it('does not decide a request through the path of another registration', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0]);
    const other = await register(fixture, [0]);
    const result = await submit(registration, { firstName: 'Nová' });

    const response = await call(
      'POST',
      `${managed(fixture, other)}/changes/${result.body.change.id}/approve`,
      owner(fixture),
    );

    expect(response.status).toBe(404);
  });
});
