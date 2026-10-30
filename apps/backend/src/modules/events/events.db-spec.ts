import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { EventPaymentSettingsController } from '@/modules/events/controllers/event-payment-settings.controller';
import { EventTermsController } from '@/modules/events/controllers/event-terms.controller';
import { EventsController } from '@/modules/events/controllers/events.controller';
import { PublicEventsController } from '@/modules/events/controllers/public-events.controller';
import { EventsRepository } from '@/modules/events/repositories/events.repository';
import { EventsService } from '@/modules/events/services/events.service';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// S2-04, S2-06 and S2-09 through the HTTP API against a real database: controllers, validation,
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
      PublicEventsController,
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
  paymentReminderDays: 14,
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

  it('accepts a reminder period of more than a year', async () => {
    const { ownerId, path } = await draftEvent();
    const saved = await call(ownerId, 'PUT', `${path}/payment-settings`, {
      ...ACCOUNT,
      paymentReminderDays: 366,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.paymentSettings.paymentReminderDays).toBe(366);
  });

  it('rejects the old deadline contract instead of accepting an alias', async () => {
    const { ownerId, path } = await draftEvent();
    const { paymentReminderDays, ...account } = ACCOUNT;
    const attempt = await call(ownerId, 'PUT', `${path}/payment-settings`, {
      ...account,
      paymentDueDays: paymentReminderDays,
    });
    expect(attempt.status).toBe(400);
    expect((await call(ownerId, 'GET', path)).body.paymentSettings).toBeNull();
  });

  it('accepts the largest value the column holds', async () => {
    const { ownerId, path } = await draftEvent();
    const saved = await call(ownerId, 'PUT', `${path}/payment-settings`, {
      ...ACCOUNT,
      paymentReminderDays: 2_147_483_647,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.paymentSettings.paymentReminderDays).toBe(2_147_483_647);
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
    ['paymentReminderDays', { paymentReminderDays: 0 }],
    ['paymentReminderDays', { paymentReminderDays: -3 }],
    ['paymentReminderDays', { paymentReminderDays: 2_147_483_648 }],
    ['paymentReminderDays', { paymentReminderDays: 1.5 }],
    ['paymentReminderDays', { paymentReminderDays: '14' }],
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
      rooms: [{ baseBeds: 2, termIndexes: [0] }],
    });
    const registration = await createRegistration(prisma, {
      event,
      terms: [{ term: terms[0], status: 'confirmed' }],
    });
    await prisma.registration.update({
      where: { id: registration.id },
      data: { paymentReminderAt: new Date('2026-10-01T10:00:00Z') },
    });
    await createPayment(prisma, {
      registration,
      recordedById: owner.id,
      amountMinor: 5_000,
    });
    const registrationQuery = {
      where: { id: registration.id },
      include: { terms: true, payments: true },
    } as const;
    const before =
      await prisma.registration.findUniqueOrThrow(registrationQuery);
    const availabilityBefore = await prisma.roomTermAvailability.findMany({
      where: { eventId: event.id },
    });
    const path = `organizations/${organization.id}/events/${event.id}`;
    const changedSettings = { ...ACCOUNT, paymentReminderDays: 30 };

    const changed = await call(
      owner.id,
      'PUT',
      `${path}/payment-settings`,
      changedSettings,
    );
    expect(changed.status).toBe(200);
    expect(changed.body.isLocked).toBe(true);
    expect(changed.body.paymentSettings).toEqual(changedSettings);

    expect(
      await prisma.registration.findUniqueOrThrow(registrationQuery),
    ).toEqual(before);
    expect(
      await prisma.roomTermAvailability.findMany({
        where: { eventId: event.id },
      }),
    ).toEqual(availabilityBefore);
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

// S2-06: opening registration and the public link.

/** A draft with one term (free is fine) and the account, ready to open. */
const readyEvent = async (): Promise<
  Awaited<ReturnType<typeof draftEvent>> & { eventId: string }
> => {
  const draft = await draftEvent();
  await call(draft.ownerId, 'POST', `${draft.path}/terms`, {
    ...FIRST,
    priceMinor: 0,
  });
  await call(draft.ownerId, 'PUT', `${draft.path}/payment-settings`, ACCOUNT);
  return { ...draft, eventId: draft.path.split('/').pop() as string };
};

const publicCall = async (publicId: string): Promise<Call> => {
  const response = await fetch(`${baseUrl}/public/events/${publicId}`);
  return { status: response.status, body: await response.json() };
};

describe('opening registration', () => {
  it('lists everything missing on a new draft and refuses to open it', async () => {
    const { ownerId, path } = await draftEvent();
    const eventId = path.split('/').pop();
    const draft = await call(ownerId, 'GET', path);
    expect(draft.body.openingBlockers).toEqual(['terms', 'paymentSettings']);

    const refused = await call(ownerId, 'POST', `${path}/open-registration`);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({
      code: 'opening_conditions_not_met',
      blockers: ['terms', 'paymentSettings'],
    });
    const stored = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
    });
    expect(stored).toMatchObject({ status: 'draft', firstOpenedAt: null });
  });

  it.each([
    ['name', { name: '' }],
    ['description', { description: ' ' }],
    ['location', { location: '' }],
    ['paymentSettings', { bankAccountNumber: '2000145398' }],
  ])(
    'refuses to open when %s is missing or invalid, checked by the server',
    async (blocker, change) => {
      const { ownerId, path, eventId } = await readyEvent();
      await prisma.event.update({ where: { id: eventId }, data: change });

      const refused = await call(ownerId, 'POST', `${path}/open-registration`);
      expect(refused.status).toBe(409);
      expect(refused.body.blockers).toEqual([blocker]);
      expect(
        (await prisma.event.findUniqueOrThrow({ where: { id: eventId } }))
          .status,
      ).toBe('draft');
    },
  );

  it('opens an event without rooms and with a free term, and keeps it open', async () => {
    const { ownerId, path, eventId } = await readyEvent();
    const before = await call(ownerId, 'GET', path);
    expect(before.body.openingBlockers).toEqual([]);
    expect(before.body.terms).toEqual([
      expect.objectContaining({ priceMinor: 0, capacity: 0 }),
    ]);

    const opened = await call(ownerId, 'POST', `${path}/open-registration`);
    expect(opened.status).toBe(200);
    expect(opened.body).toMatchObject({ status: 'open', isLocked: true });

    const stored = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
    });
    expect(stored.status).toBe('open');
    expect(stored.firstOpenedAt).not.toBeNull();
    expect((await call(ownerId, 'GET', path)).body).toMatchObject({
      status: 'open',
      isLocked: true,
    });
  });

  it('locks the data from the first opening and keeps the public link', async () => {
    const { ownerId, path } = await readyEvent();
    const publicId = (await call(ownerId, 'GET', path)).body.publicId;
    expect(publicId).toMatch(/^[A-Za-z0-9_-]{12}$/);
    await call(ownerId, 'PUT', path, { ...BASICS, name: 'Přejmenováno' });
    expect((await call(ownerId, 'GET', path)).body.publicId).toBe(publicId);

    await call(ownerId, 'POST', `${path}/open-registration`);

    expect((await call(ownerId, 'GET', path)).body.publicId).toBe(publicId);
    const attempts = [
      await call(ownerId, 'PUT', path, BASICS),
      await call(ownerId, 'POST', `${path}/terms`, {
        ...FIRST,
        startDate: '2027-08-01',
        endDate: '2027-08-02',
      }),
    ];
    for (const attempt of attempts) {
      expect(attempt.status).toBe(409);
      expect(attempt.body.code).toBe('event_locked');
    }
  });

  it('opens once when asked twice at the same time', async () => {
    const { ownerId, path, eventId } = await readyEvent();
    const answers = await Promise.all([
      call(ownerId, 'POST', `${path}/open-registration`),
      call(ownerId, 'POST', `${path}/open-registration`),
    ]);
    expect(answers.map((answer) => answer.status)).toEqual([200, 200]);

    const first = (
      await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    ).firstOpenedAt;
    await call(ownerId, 'POST', `${path}/open-registration`);
    expect(
      (await prisma.event.findUniqueOrThrow({ where: { id: eventId } }))
        .firstOpenedAt,
    ).toEqual(first);
  });

  it.each([
    [
      'its last term is removed',
      'terms',
      (tx: Prisma.TransactionClient, eventId: string): Promise<unknown> =>
        tx.eventTerm.deleteMany({ where: { eventId } }),
    ],
    [
      'its payment settings are cleared',
      'paymentSettings',
      (tx: Prisma.TransactionClient, eventId: string): Promise<unknown> =>
        tx.event.update({
          where: { id: eventId },
          data: {
            bankAccountPrefix: null,
            bankAccountNumber: null,
            bankCode: null,
            paymentReminderDays: null,
          },
        }),
    ],
  ])(
    'waits for a concurrent change and refuses when %s meanwhile',
    async (_name, blocker, change) => {
      const { ownerId, path, eventId } = await readyEvent();
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      let locked!: () => void;
      const hasLock = new Promise<void>((resolve) => (locked = resolve));

      // Another writer holds the event row lock and has made its change, but
      // has not committed yet.
      const writer = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId}::uuid FOR UPDATE`;
        await change(tx, eventId);
        locked();
        await released;
      });
      await hasLock;

      let settled = false;
      const opening = call(ownerId, 'POST', `${path}/open-registration`).then(
        (answer) => {
          settled = true;
          return answer;
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(settled).toBe(false);

      release();
      await writer;
      const answer = await opening;
      expect(answer.status).toBe(409);
      expect(answer.body.blockers).toEqual([blocker]);
      expect(
        (await prisma.event.findUniqueOrThrow({ where: { id: eventId } }))
          .status,
      ).toBe('draft');
    },
  );

  it('does not open a closed event again', async () => {
    const { ownerId, path, eventId } = await readyEvent();
    await call(ownerId, 'POST', `${path}/open-registration`);
    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'closed' },
    });
    const refused = await call(ownerId, 'POST', `${path}/open-registration`);
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('event_not_draft');
  });

  it('answers 404 to another organizer and changes nothing', async () => {
    const { path, eventId } = await readyEvent();
    const stranger = await createOrganizer(prisma);
    const refused = await call(
      stranger.id,
      'POST',
      `${path}/open-registration`,
    );
    expect(refused.status).toBe(404);
    expect(
      (await prisma.event.findUniqueOrThrow({ where: { id: eventId } })).status,
    ).toBe('draft');
  });
});

describe('public event page', () => {
  it('shows nothing of a draft, the same as an unknown link', async () => {
    const { ownerId, path } = await readyEvent();
    const publicId = (await call(ownerId, 'GET', path)).body.publicId;

    const draft = await publicCall(publicId);
    const unknown = await publicCall('nonexistent12');
    expect(draft.status).toBe(404);
    expect(draft.body).toEqual(unknown.body);
    expect(JSON.stringify(draft.body)).not.toContain(BASICS.name);
    expect((await publicCall('x y/z')).status).toBe(404);
  });

  it('shows only the public content of an open event, without signing in', async () => {
    const { ownerId, path } = await readyEvent();
    await call(ownerId, 'POST', `${path}/open-registration`);
    const publicId = (await call(ownerId, 'GET', path)).body.publicId;

    const response = await publicCall(publicId);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...BASICS,
      terms: [
        {
          id: expect.any(String),
          label: FIRST.label,
          startDate: FIRST.startDate,
          endDate: FIRST.endDate,
          priceMinor: 0,
        },
      ],
    });
  });

  it('does not show a closed event', async () => {
    const { ownerId, path, eventId } = await readyEvent();
    await call(ownerId, 'POST', `${path}/open-registration`);
    const publicId = (await call(ownerId, 'GET', path)).body.publicId;
    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'closed' },
    });
    expect((await publicCall(publicId)).status).toBe(404);
  });
});
