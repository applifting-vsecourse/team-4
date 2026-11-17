import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { EventPaymentsController } from '@/modules/registrations/controllers/event-payments.controller';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { EventPaymentsService } from '@/modules/registrations/services/event-payments.service';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// S4-09 through the HTTP API against a real database: the received payments
// and balances of one event, and its scope. Only the BetterAuth session is
// replaced: the `x-test-user` header names the caller.
// Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

// The real guard pulls in BetterAuth, which is ESM-only and cannot load under
// Jest's CommonJS runtime, so the whole guard module is replaced (jest.mock is
// hoisted above the imports).
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
    controllers: [EventPaymentsController],
    providers: [EventPaymentsService, EventRegistrationsRepository],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

const get = async (userId: string | null, path: string): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    headers: userId ? { 'x-test-user': userId } : {},
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const T1 = {
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  label: 'T1',
  priceMinor: 100_000,
};

const pathOf = (organizationId: string, eventId: string): string =>
  `organizations/${organizationId}/events/${eventId}/payments`;

type Fixture = {
  ownerId: string;
  organizationId: string;
  path: string;
  owing: Registration;
  settled: Registration;
  waiting: Registration;
};

/** An event with an owing, a settled and a waitlisted registration. */
const fixture = async (): Promise<Fixture> => {
  const organization = await createOrganization(prisma);
  const { event, terms } = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [T1],
  });
  const owing = await createRegistration(prisma, {
    event,
    terms: [{ term: terms[0], status: 'confirmed' }],
  });
  const settled = await createRegistration(prisma, {
    event,
    terms: [{ term: terms[0], status: 'confirmed' }],
  });
  const waiting = await createRegistration(prisma, {
    event,
    terms: [{ term: terms[0], status: 'waitlisted' }],
  });
  const recordedById = organization.ownerId;
  await createPayment(prisma, {
    registration: owing,
    recordedById,
    amountMinor: 30_000,
    receivedOn: '2026-10-01',
  });
  await createPayment(prisma, {
    registration: settled,
    recordedById,
    amountMinor: 100_000,
    receivedOn: '2026-10-05',
  });
  return {
    ownerId: organization.ownerId,
    organizationId: organization.id,
    path: pathOf(organization.id, event.id),
    owing,
    settled,
    waiting,
  };
};

describe('the payments overview of an event', () => {
  it('lists the received payments newest first, with their registration', async () => {
    const f = await fixture();
    const result = await get(f.ownerId, f.path);

    expect(result.status).toBe(200);
    expect(result.body.payments).toMatchObject([
      {
        receivedOn: '2026-10-05',
        amountMinor: 100_000,
        source: 'organizer',
        registration: {
          id: f.settled.id,
          firstName: f.settled.firstName,
          lastName: f.settled.lastName,
          variableSymbol: f.settled.variableSymbol,
        },
      },
      {
        receivedOn: '2026-10-01',
        amountMinor: 30_000,
        registration: { id: f.owing.id },
      },
    ]);
  });

  it('shows the balances of registrations with something due', async () => {
    const f = await fixture();
    const result = await get(f.ownerId, f.path);

    expect(result.body.balances).toEqual([
      {
        registration: {
          id: f.owing.id,
          firstName: f.owing.firstName,
          lastName: f.owing.lastName,
          variableSymbol: f.owing.variableSymbol,
        },
        amountDueMinor: 100_000,
        paidMinor: 30_000,
        balanceMinor: 70_000,
        paymentState: 'partial',
      },
      expect.objectContaining({
        registration: expect.objectContaining({ id: f.settled.id }),
        balanceMinor: 0,
        paymentState: 'paid',
      }),
    ]);
  });

  it('is empty for an event without registrations', async () => {
    const organization = await createOrganization(prisma);
    const { event } = await createEvent(prisma, {
      organizationId: organization.id,
      terms: [T1],
    });
    const result = await get(
      organization.ownerId,
      pathOf(organization.id, event.id),
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ payments: [], balances: [] });
  });

  it('holds only the selected event', async () => {
    const f = await fixture();
    const { event: other } = await createEvent(prisma, {
      organizationId: f.organizationId,
      terms: [T1],
    });
    const result = await get(f.ownerId, pathOf(f.organizationId, other.id));

    expect(result.body).toEqual({ payments: [], balances: [] });
  });
});

describe('access to the payments overview', () => {
  it('is 404 for an organizer of another organization', async () => {
    const f = await fixture();
    const stranger = await createOrganizer(prisma);
    const result = await get(stranger.id, f.path);

    expect(result.status).toBe(404);
    expect(JSON.stringify(result.body)).not.toContain(f.owing.lastName);
  });

  it('is 404 for an event under another organization of the caller', async () => {
    const f = await fixture();
    const own = await createOrganization(prisma, { ownerId: f.ownerId });
    const eventId = f.path.split('/')[3];
    const result = await get(f.ownerId, pathOf(own.id, eventId));

    expect(result.status).toBe(404);
  });

  it('is refused without a session', async () => {
    const f = await fixture();
    const result = await get(null, f.path);

    expect(result.status).toBe(403);
  });
});
