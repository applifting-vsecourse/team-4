import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { PaymentsController } from '@/modules/registrations/controllers/payments.controller';
import { todayInPrague } from '@/modules/registrations/domain/payment';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { PaymentsRepository } from '@/modules/registrations/repositories/payments.repository';
import { PaymentsService } from '@/modules/registrations/services/payments.service';
import {
  createEvent,
  createOrganization,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// S2-12 through the HTTP API against a real database: recording a payment,
// the recomputed balance, validation, protection against repeats and access.
// Only the BetterAuth session is replaced: `x-test-user` names the caller.
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

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [PaymentsController],
    providers: [
      PaymentsService,
      PaymentsRepository,
      EventRegistrationsRepository,
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

const post = async (
  userId: string | null,
  path: string,
  body: unknown,
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(userId ? { 'x-test-user': userId } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const payment = (
  amountMinor: number,
  receivedOn = '2026-10-01',
  submissionKey = randomUUID(),
): { submissionKey: string; amountMinor: number; receivedOn: string } => ({
  submissionKey,
  amountMinor,
  receivedOn,
});

type Fixture = {
  ownerId: string;
  registration: Registration;
  path: string;
};

const T1 = {
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  label: 'T1',
  priceMinor: 100_000,
};

/** A registration owing 1 000 Kč, or nothing when its only term is waitlisted. */
const fixture = async (
  status: 'confirmed' | 'waitlisted' = 'confirmed',
): Promise<Fixture> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [T1],
  });
  const registration = await createRegistration(prisma, {
    event: created.event,
    terms: [{ term: created.terms[0], status }],
  });
  return {
    ownerId: organization.ownerId,
    registration,
    path: `organizations/${organization.id}/events/${created.event.id}/registrations/${registration.id}/payments`,
  };
};

const count = (registrationId: string): Promise<number> =>
  prisma.payment.count({ where: { registrationId } });

describe('recording a payment', () => {
  it('shows a partial payment as paid and the rest as debt', async () => {
    const f = await fixture();
    const result = await post(f.ownerId, f.path, payment(60_000, '2026-10-02'));
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      amountDueMinor: 100_000,
      paidMinor: 60_000,
      balanceMinor: 40_000,
      paymentState: 'partial',
      payments: [{ receivedOn: '2026-10-02', amountMinor: 60_000 }],
    });
  });

  it('settles the debt, then shows an overpayment', async () => {
    const f = await fixture();
    await post(f.ownerId, f.path, payment(60_000));
    const settled = await post(f.ownerId, f.path, payment(40_000));
    expect(settled.body).toMatchObject({
      balanceMinor: 0,
      paymentState: 'paid',
    });
    const over = await post(f.ownerId, f.path, payment(20_000));
    expect(over.body).toMatchObject({
      paidMinor: 120_000,
      balanceMinor: -20_000,
      paymentState: 'overpaid',
    });
    expect(over.body.payments).toHaveLength(3);
  });

  it('keeps the payment in the database', async () => {
    const f = await fixture();
    await post(f.ownerId, f.path, payment(25_050, '2026-10-03'));
    const stored = await prisma.payment.findFirstOrThrow({
      where: { registrationId: f.registration.id },
    });
    expect(stored).toMatchObject({
      amountMinor: 25_050,
      recordedById: f.ownerId,
    });
    expect(stored.receivedOn.toISOString()).toBe('2026-10-03T00:00:00.000Z');
  });

  it('is accepted without an obligation and shows as an overpayment', async () => {
    const f = await fixture('waitlisted');
    const result = await post(f.ownerId, f.path, payment(50_000));
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      amountDueMinor: 0,
      paidMinor: 50_000,
      balanceMinor: -50_000,
      paymentState: 'overpaid',
    });
  });

  it('accepts today in Prague', async () => {
    const f = await fixture();
    const result = await post(
      f.ownerId,
      f.path,
      payment(10_000, todayInPrague()),
    );
    expect(result.status).toBe(201);
  });
});

describe('an invalid payment', () => {
  const rejected = async (
    body: Record<string, unknown>,
  ): Promise<Call & { saved: number }> => {
    const f = await fixture();
    const result = await post(f.ownerId, f.path, {
      ...payment(10_000),
      ...body,
    });
    return { ...result, saved: await count(f.registration.id) };
  };

  it.each([
    ['zero', { amountMinor: 0 }],
    ['negative', { amountMinor: -100 }],
    ['with a fraction of a haléř', { amountMinor: 100.5 }],
    ['above the maximum', { amountMinor: 1_000_000_001 }],
    ['not a number', { amountMinor: '100' }],
    ['a date that does not exist', { receivedOn: '2026-02-30' }],
    ['a malformed date', { receivedOn: '2.7.2027' }],
    ['a missing key', { submissionKey: undefined }],
  ])('%s is a 400 and saves nothing', async (_name, body) => {
    const result = await rejected(body);
    expect(result.status).toBe(400);
    expect(result.saved).toBe(0);
  });

  it('a date after today in Prague is refused at the field', async () => {
    const result = await rejected({ receivedOn: '2999-01-01' });
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      code: 'received_on_future',
      field: 'receivedOn',
    });
    expect(result.saved).toBe(0);
  });
});

describe('repeating a request', () => {
  it('does not record the payment twice', async () => {
    const f = await fixture();
    const body = payment(60_000);
    const first = await post(f.ownerId, f.path, body);
    const repeat = await post(f.ownerId, f.path, body);
    expect(first.status).toBe(201);
    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
    expect(repeat.body.paidMinor).toBe(60_000);
    expect(await count(f.registration.id)).toBe(1);
  });

  it('records one payment for simultaneous double clicks', async () => {
    const f = await fixture();
    const body = payment(60_000);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => post(f.ownerId, f.path, body)),
    );
    expect(results.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(results.every((r) => r.body.paidMinor === 60_000)).toBe(true);
    expect(await count(f.registration.id)).toBe(1);
  });

  it('refuses a key sent before with other content', async () => {
    const f = await fixture();
    const key = randomUUID();
    await post(f.ownerId, f.path, payment(60_000, '2026-10-01', key));
    const other = await post(
      f.ownerId,
      f.path,
      payment(70_000, '2026-10-01', key),
    );
    expect(other.status).toBe(409);
    expect(other.body.code).toBe('submission_key_reused');
    expect(await count(f.registration.id)).toBe(1);
  });
});

describe('access', () => {
  it('needs a signed-in organizer', async () => {
    const f = await fixture();
    expect((await post(null, f.path, payment(10_000))).status).toBe(403);
    expect(await count(f.registration.id)).toBe(0);
  });

  it("hides another organization's registration like a missing one", async () => {
    const f = await fixture();
    const stranger = await createOrganization(prisma);
    const result = await post(stranger.ownerId, f.path, payment(10_000));
    expect(result.status).toBe(404);
    expect(await count(f.registration.id)).toBe(0);
  });

  it('does not find a registration under another event', async () => {
    const f = await fixture();
    const other = await fixture();
    const crossed = other.path.replace(
      /registrations\/.*$/,
      `registrations/${f.registration.id}/payments`,
    );
    const result = await post(other.ownerId, crossed, payment(10_000));
    expect(result.status).toBe(404);
    expect(await count(f.registration.id)).toBe(0);
  });
});
