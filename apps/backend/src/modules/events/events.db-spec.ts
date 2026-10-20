import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { EventPaymentSettingsController } from '@/modules/events/controllers/event-payment-settings.controller';
import { EventTermsController } from '@/modules/events/controllers/event-terms.controller';
import { EventsController } from '@/modules/events/controllers/events.controller';
import { EventsRepository } from '@/modules/events/repositories/events.repository';
import { EventsService } from '@/modules/events/services/events.service';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// S2-04 through the HTTP API against a real database: controllers, validation,
// service rules, the event row lock and the constraints together. Only the
// BetterAuth session is replaced: the `x-test-user` header names the caller.
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
    controllers: [
      EventsController,
      EventTermsController,
      EventPaymentSettingsController,
    ],
    providers: [EventsService, EventsRepository],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

// Response bodies are asserted field by field; typing every DTO here adds nothing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

const call = async (
  userId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-test-user': userId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const BASICS = {
  name: 'Lesní dobrodružství 2027',
  description: 'Letní tábor',
  location: 'Podlesí',
};

const FIRST = {
  label: '1. turnus',
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  priceMinor: 790000,
};

/** An own organization with one draft event. */
const draftEvent = async (): Promise<{
  ownerId: string;
  path: string;
  organizationId: string;
}> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const created = await call(
    owner.id,
    'POST',
    `organizations/${organization.id}/events`,
    BASICS,
  );
  expect(created.status).toBe(201);
  return {
    ownerId: owner.id,
    organizationId: organization.id,
    path: `organizations/${organization.id}/events/${created.body.id}`,
  };
};

describe('creating and editing an event', () => {
  it('creates a draft without terms that is listed in its organization', async () => {
    const { ownerId, organizationId, path } = await draftEvent();

    const detail = await call(ownerId, 'GET', path);
    expect(detail.body).toMatchObject({
      ...BASICS,
      status: 'draft',
      isLocked: false,
      terms: [],
    });

    const list = await call(
      ownerId,
      'GET',
      `organizations/${organizationId}/events`,
    );
    expect(list.body).toEqual([
      expect.objectContaining({
        name: BASICS.name,
        description: BASICS.description,
        status: 'draft',
        termCount: 0,
        period: null,
      }),
    ]);
  });

  it.each(['name', 'description', 'location'])(
    'rejects a missing or blank %s',
    async (field) => {
      const { ownerId, organizationId } = await draftEvent();
      for (const value of [undefined, '   ']) {
        const response = await call(
          ownerId,
          'POST',
          `organizations/${organizationId}/events`,
          { ...BASICS, [field]: value },
        );
        expect(response.status).toBe(400);
      }
    },
  );

  it('changes only the edited event', async () => {
    const first = await draftEvent();
    const other = await call(
      first.ownerId,
      'POST',
      `organizations/${first.organizationId}/events`,
      { ...BASICS, name: 'Jiná akce' },
    );

    const updated = await call(first.ownerId, 'PUT', first.path, {
      name: ' Nový název ',
      description: 'Nový popis',
      location: 'Nové místo',
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      name: 'Nový název',
      description: 'Nový popis',
      location: 'Nové místo',
    });

    const untouched = await call(
      first.ownerId,
      'GET',
      `organizations/${first.organizationId}/events/${other.body.id}`,
    );
    expect(untouched.body.name).toBe('Jiná akce');
  });
});

describe('terms', () => {
  it('stores several terms with their dates and prices, sorted by start', async () => {
    const { ownerId, path } = await draftEvent();
    await call(ownerId, 'POST', `${path}/terms`, {
      label: '2. turnus',
      startDate: '2027-07-08',
      endDate: '2027-07-08',
      priceMinor: 0,
    });
    await call(ownerId, 'POST', `${path}/terms`, {
      ...FIRST,
      priceMinor: 790050,
    });

    const detail = await call(ownerId, 'GET', path);
    expect(detail.body.terms).toEqual([
      expect.objectContaining({
        label: '1. turnus',
        startDate: '2027-07-01',
        endDate: '2027-07-07',
        priceMinor: 790050,
        capacity: 0,
      }),
      expect.objectContaining({
        label: '2. turnus',
        startDate: '2027-07-08',
        endDate: '2027-07-08',
        priceMinor: 0,
      }),
    ]);
  });

  it.each([
    ['a missing label', { label: '' }],
    ['a missing price', { priceMinor: undefined }],
    ['a negative price', { priceMinor: -100 }],
    ['a fraction of a haléř', { priceMinor: 100.5 }],
    ['a price as text', { priceMinor: '7900' }],
    ['an impossible date', { startDate: '2027-02-30' }],
    ['a date with time', { startDate: '2027-07-01T00:00:00Z' }],
    ['a missing end', { endDate: undefined }],
  ])('rejects %s', async (_case, overrides) => {
    const { ownerId, path } = await draftEvent();
    const response = await call(ownerId, 'POST', `${path}/terms`, {
      ...FIRST,
      ...overrides,
    });
    expect(response.status).toBe(400);
    expect((await call(ownerId, 'GET', path)).body.terms).toEqual([]);
  });

  it('rejects an end before the start, on add and on edit', async () => {
    const { ownerId, path } = await draftEvent();
    const backwards = {
      ...FIRST,
      startDate: '2027-07-07',
      endDate: '2027-07-06',
    };

    const added = await call(ownerId, 'POST', `${path}/terms`, backwards);
    expect(added.status).toBe(400);
    expect(added.body).toMatchObject({ code: 'term_dates', field: 'endDate' });

    const termId = (await call(ownerId, 'POST', `${path}/terms`, FIRST)).body
      .terms[0].id;
    const edited = await call(
      ownerId,
      'PUT',
      `${path}/terms/${termId}`,
      backwards,
    );
    expect(edited.status).toBe(400);
    expect((await call(ownerId, 'GET', path)).body.terms[0]).toMatchObject(
      FIRST,
    );
  });

  it('rejects a shared boundary day and allows the next day, on add and on edit', async () => {
    const { ownerId, path } = await draftEvent();
    await call(ownerId, 'POST', `${path}/terms`, FIRST);

    const overlapping = await call(ownerId, 'POST', `${path}/terms`, {
      label: '2. turnus',
      startDate: '2027-07-07',
      endDate: '2027-07-10',
      priceMinor: 0,
    });
    expect(overlapping.status).toBe(409);
    expect(overlapping.body).toMatchObject({ code: 'term_overlap' });

    const adjacent = await call(ownerId, 'POST', `${path}/terms`, {
      label: '2. turnus',
      startDate: '2027-07-08',
      endDate: '2027-07-10',
      priceMinor: 0,
    });
    expect(adjacent.status).toBe(201);
    const second = adjacent.body.terms[1];

    const moved = await call(ownerId, 'PUT', `${path}/terms/${second.id}`, {
      ...second,
      id: undefined,
      capacity: undefined,
      startDate: '2027-07-05',
    });
    expect(moved.status).toBe(409);
    expect((await call(ownerId, 'GET', path)).body.terms[1].startDate).toBe(
      '2027-07-08',
    );
  });

  it('allows overlapping terms in different events', async () => {
    const first = await draftEvent();
    const second = await draftEvent();
    expect(
      (await call(first.ownerId, 'POST', `${first.path}/terms`, FIRST)).status,
    ).toBe(201);
    expect(
      (await call(second.ownerId, 'POST', `${second.path}/terms`, FIRST))
        .status,
    ).toBe(201);
  });

  it('edits one term without changing another and removes the last one', async () => {
    const { ownerId, path } = await draftEvent();
    await call(ownerId, 'POST', `${path}/terms`, FIRST);
    const [first, second] = (
      await call(ownerId, 'POST', `${path}/terms`, {
        label: '2. turnus',
        startDate: '2027-07-08',
        endDate: '2027-07-14',
        priceMinor: 650000,
      })
    ).body.terms;

    await call(ownerId, 'PUT', `${path}/terms/${first.id}`, {
      ...FIRST,
      label: '1. turnus (zkrácený)',
      endDate: '2027-07-05',
      priceMinor: 12345,
    });
    const terms = (await call(ownerId, 'GET', path)).body.terms;
    expect(terms[0]).toMatchObject({
      endDate: '2027-07-05',
      priceMinor: 12345,
    });
    expect(terms[1]).toEqual(second);

    await call(ownerId, 'DELETE', `${path}/terms/${first.id}`);
    const removed = await call(ownerId, 'DELETE', `${path}/terms/${second.id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.terms).toEqual([]);
  });

  it('refuses a term of another event addressed through this one', async () => {
    const first = await draftEvent();
    const other = await call(
      first.ownerId,
      'POST',
      `organizations/${first.organizationId}/events`,
      BASICS,
    );
    const foreignTermId = (
      await call(
        first.ownerId,
        'POST',
        `organizations/${first.organizationId}/events/${other.body.id}/terms`,
        FIRST,
      )
    ).body.terms[0].id;

    expect(
      (
        await call(
          first.ownerId,
          'DELETE',
          `${first.path}/terms/${foreignTermId}`,
        )
      ).status,
    ).toBe(404);
  });
});

describe('locking after the first opening', () => {
  it.each(['open', 'closed'] as const)(
    'refuses every change on an event that is %s, and keeps the data',
    async (status) => {
      const owner = await createOrganizer(prisma);
      const organization = await createOrganization(prisma, {
        ownerId: owner.id,
      });
      const { event, terms } = await createEvent(prisma, {
        organizationId: organization.id,
        status,
        terms: [{ startDate: '2027-07-01', endDate: '2027-07-07' }],
      });
      const path = `organizations/${organization.id}/events/${event.id}`;
      const termPath = `${path}/terms/${terms[0].id}`;
      const before = (await call(owner.id, 'GET', path)).body;
      expect(before.isLocked).toBe(true);

      const attempts = [
        await call(owner.id, 'PUT', path, BASICS),
        await call(owner.id, 'POST', `${path}/terms`, {
          ...FIRST,
          startDate: '2027-08-01',
          endDate: '2027-08-02',
        }),
        await call(owner.id, 'PUT', termPath, FIRST),
        await call(owner.id, 'DELETE', termPath),
      ];
      for (const attempt of attempts) {
        expect(attempt.status).toBe(409);
        expect(attempt.body).toMatchObject({ code: 'event_locked' });
      }
      expect((await call(owner.id, 'GET', path)).body).toEqual(before);
    },
  );

  it('stays locked after closing a re-opened event', async () => {
    const owner = await createOrganizer(prisma);
    const organization = await createOrganization(prisma, {
      ownerId: owner.id,
    });
    const { event } = await createEvent(prisma, {
      organizationId: organization.id,
      status: 'open',
    });
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'closed' },
    });
    const path = `organizations/${organization.id}/events/${event.id}`;
    expect((await call(owner.id, 'PUT', path, BASICS)).status).toBe(409);
  });
});

const ACCOUNT = {
  bankAccountPrefix: '19',
  bankAccountNumber: '2000145399',
  bankCode: '0800',
  paymentDueDays: 14,
};

describe('payment settings', () => {
  it('starts empty and keeps the saved values after reloading', async () => {
    const { ownerId, path } = await draftEvent();
    expect((await call(ownerId, 'GET', path)).body.paymentSettings).toBeNull();

    const saved = await call(
      ownerId,
      'PUT',
      `${path}/payment-settings`,
      ACCOUNT,
    );
    expect(saved.status).toBe(200);
    expect(saved.body.paymentSettings).toEqual(ACCOUNT);
    expect((await call(ownerId, 'GET', path)).body.paymentSettings).toEqual(
      ACCOUNT,
    );
  });

  it('accepts a due period of more than a year', async () => {
    const { ownerId, path } = await draftEvent();
    const saved = await call(ownerId, 'PUT', `${path}/payment-settings`, {
      ...ACCOUNT,
      paymentDueDays: 366,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.paymentSettings.paymentDueDays).toBe(366);
  });

  it('accepts the largest value the column holds', async () => {
    const { ownerId, path } = await draftEvent();
    const saved = await call(ownerId, 'PUT', `${path}/payment-settings`, {
      ...ACCOUNT,
      paymentDueDays: 2_147_483_647,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.paymentSettings.paymentDueDays).toBe(2_147_483_647);
  });

  it('accepts an account without a prefix', async () => {
    const { ownerId, path } = await draftEvent();
    const saved = await call(ownerId, 'PUT', `${path}/payment-settings`, {
      ...ACCOUNT,
      bankAccountPrefix: '',
      bankAccountNumber: '123457',
    });
    expect(saved.status).toBe(200);
    expect(saved.body.paymentSettings).toEqual({
      ...ACCOUNT,
      bankAccountPrefix: null,
      bankAccountNumber: '123457',
    });
  });

  it.each([
    ['bankAccountNumber', { bankAccountNumber: '2000145398' }],
    ['bankAccountNumber', { bankAccountNumber: '12a' }],
    ['bankAccountNumber', { bankAccountNumber: '' }],
    ['bankAccountPrefix', { bankAccountPrefix: '20' }],
    ['bankAccountPrefix', { bankAccountPrefix: '1234567' }],
    ['bankCode', { bankCode: '80' }],
    ['paymentDueDays', { paymentDueDays: 0 }],
    ['paymentDueDays', { paymentDueDays: -3 }],
    ['paymentDueDays', { paymentDueDays: 2_147_483_648 }],
    ['paymentDueDays', { paymentDueDays: 1.5 }],
    ['paymentDueDays', { paymentDueDays: '14' }],
  ])(
    'refuses an invalid %s and keeps the stored settings',
    async (field, change) => {
      const { ownerId, path } = await draftEvent();
      await call(ownerId, 'PUT', `${path}/payment-settings`, ACCOUNT);

      const attempt = await call(ownerId, 'PUT', `${path}/payment-settings`, {
        ...ACCOUNT,
        ...change,
      });
      expect(attempt.status).toBe(400);
      expect(attempt.body).toMatchObject({ field });
      expect(typeof attempt.body.message).toBe('string');
      expect((await call(ownerId, 'GET', path)).body.paymentSettings).toEqual(
        ACCOUNT,
      );
    },
  );

  it('changes the settings after opening without touching existing registrations', async () => {
    const owner = await createOrganizer(prisma);
    const organization = await createOrganization(prisma, {
      ownerId: owner.id,
    });
    const { event, terms } = await createEvent(prisma, {
      organizationId: organization.id,
      status: 'open',
      terms: [{ startDate: '2027-07-01', endDate: '2027-07-07' }],
    });
    const registration = await createRegistration(prisma, {
      event,
      terms: [{ term: terms[0], status: 'confirmed' }],
    });
    const path = `organizations/${organization.id}/events/${event.id}`;

    const changed = await call(
      owner.id,
      'PUT',
      `${path}/payment-settings`,
      ACCOUNT,
    );
    expect(changed.status).toBe(200);
    expect(changed.body.isLocked).toBe(true);
    expect(changed.body.paymentSettings).toEqual(ACCOUNT);

    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: registration.id },
    });
    expect(stored).toMatchObject({
      bankAccountPrefix: null,
      bankAccountNumber: '123457',
      bankCode: '0100',
      paymentDueDays: 14,
    });
  });

  it('answers 404 to another organizer', async () => {
    const { path } = await draftEvent();
    const stranger = await createOrganizer(prisma);
    const attempt = await call(
      stranger.id,
      'PUT',
      `${path}/payment-settings`,
      ACCOUNT,
    );
    expect(attempt.status).toBe(404);
    expect(attempt.body.message).toBe('Záznam není dostupný');
  });
});

describe('organization isolation', () => {
  it('answers 404 to another organizer for reads and every write', async () => {
    const { path, organizationId } = await draftEvent();
    const stranger = await createOrganizer(prisma);

    const attempts = [
      await call(stranger.id, 'GET', `organizations/${organizationId}/events`),
      await call(
        stranger.id,
        'POST',
        `organizations/${organizationId}/events`,
        BASICS,
      ),
      await call(stranger.id, 'GET', path),
      await call(stranger.id, 'PUT', path, BASICS),
      await call(stranger.id, 'POST', `${path}/terms`, FIRST),
    ];
    for (const attempt of attempts) {
      expect(attempt.status).toBe(404);
      expect(attempt.body.message).toBe('Záznam není dostupný');
    }
  });

  it('does not reach an event through another own organization', async () => {
    const { ownerId, path } = await draftEvent();
    const otherOrganization = await createOrganization(prisma, { ownerId });
    const eventId = path.split('/').pop();
    const response = await call(
      ownerId,
      'GET',
      `organizations/${otherOrganization.id}/events/${eventId}`,
    );
    expect(response.status).toBe(404);
  });
});
