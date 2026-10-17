import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@/generated/prisma/client';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createPayment,
  createRegistration,
  date,
} from '@/testing/factories';
import { PrismaPg } from '@prisma/adapter-pg';

// Database-level guarantees of the domain model (data-model.md §3, §8). Needs a
// migrated Postgres in DATABASE_URL: `pnpm backend test:db`. The service layer
// validates first; these constraints are the safety net under it.

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

afterAll(async () => {
  await prisma.$disconnect();
});

const SUMMER = [
  { startDate: '2027-07-01', endDate: '2027-07-07' },
  { startDate: '2027-07-08', endDate: '2027-07-14' },
];

describe('event', () => {
  it('requires firstOpenedAt once it leaves draft', async () => {
    const { event } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
      status: 'draft',
    });

    await expect(
      prisma.event.update({
        where: { id: event.id },
        data: { status: 'open' },
      }),
    ).rejects.toThrow(/event_first_opened_chk/);
  });

  it.each([
    ['paymentDueDays', { paymentDueDays: 0 }, /event_due_days_chk/],
    ['bankCode', { bankCode: '08A0' }, /event_bank_code_chk/],
    [
      'bankAccountNumber',
      { bankAccountNumber: '12-34' },
      /event_bank_number_chk/,
    ],
    [
      'bankAccountPrefix',
      { bankAccountPrefix: '12a' },
      /event_bank_prefix_chk/,
    ],
  ])('rejects an invalid %s', async (_field, data, error) => {
    const { event } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
    });

    await expect(
      prisma.event.update({ where: { id: event.id }, data }),
    ).rejects.toThrow(error);
  });
});

describe('event_term', () => {
  it('allows adjacent terms and rejects ones sharing a day', async () => {
    const { event } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
      terms: SUMMER,
    });

    await expect(
      prisma.eventTerm.create({
        data: {
          eventId: event.id,
          label: 'Overlap',
          startDate: date('2027-07-14'),
          endDate: date('2027-07-20'),
          priceMinor: 0,
        },
      }),
    ).rejects.toThrow(/event_term_no_overlap/);
  });

  it('allows the same dates in a different event', async () => {
    const organizationId = (await createOrganization(prisma)).id;
    await createEvent(prisma, { organizationId, terms: SUMMER });

    await expect(
      createEvent(prisma, { organizationId, terms: SUMMER }),
    ).resolves.toBeDefined();
  });

  it('rejects an end before the start and a negative price', async () => {
    const { event } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
    });
    const term = {
      eventId: event.id,
      label: 'Invalid',
      startDate: date('2027-08-10'),
      endDate: date('2027-08-10'),
      priceMinor: 0,
    };

    await expect(
      prisma.eventTerm.create({
        data: { ...term, endDate: date('2027-08-09') },
      }),
    ).rejects.toThrow(/event_term_dates_chk/);
    await expect(
      prisma.eventTerm.create({ data: { ...term, priceMinor: -1 } }),
    ).rejects.toThrow(/event_term_price_chk/);
    await expect(
      prisma.eventTerm.create({ data: term }),
    ).resolves.toBeDefined();
  });
});

describe('room', () => {
  it('rejects a room without beds and a duplicate label in one event', async () => {
    const { event } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
      rooms: [{ label: 'Pokoj 1', bedCount: 2, termIndexes: [] }],
    });

    await expect(
      prisma.room.create({
        data: { eventId: event.id, label: 'Pokoj 2', bedCount: 0 },
      }),
    ).rejects.toThrow(/room_bed_count_chk/);
    await expect(
      prisma.room.create({
        data: { eventId: event.id, label: 'Pokoj 1', bedCount: 1 },
      }),
    ).rejects.toThrow(/Unique constraint/);
  });

  it('cannot be made available in a term of another event', async () => {
    const organizationId = (await createOrganization(prisma)).id;
    const first = await createEvent(prisma, {
      organizationId,
      rooms: [{ bedCount: 2, termIndexes: [] }],
    });
    const second = await createEvent(prisma, { organizationId, terms: SUMMER });

    for (const eventId of [first.event.id, second.event.id]) {
      await expect(
        prisma.roomTermAvailability.create({
          data: {
            roomId: first.rooms[0].id,
            termId: second.terms[0].id,
            eventId,
          },
        }),
      ).rejects.toThrow(/Foreign key constraint/);
    }
  });
});

describe('registration', () => {
  it('gets a numeric variable symbol from the sequence', async () => {
    const { event, terms } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
      terms: SUMMER,
    });
    const first = await createRegistration(prisma, {
      event,
      terms: [{ term: terms[0], status: 'confirmed' }],
    });
    const second = await createRegistration(prisma, {
      event,
      terms: [{ term: terms[0], status: 'waitlisted' }],
    });

    expect(first.variableSymbol).toMatch(/^[0-9]{7,10}$/);
    expect(Number(second.variableSymbol)).toBeGreaterThan(
      Number(first.variableSymbol),
    );
  });

  it('allows one registration per account and event', async () => {
    const { event, terms } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
      terms: SUMMER,
    });
    const email = `twice-${randomUUID()}@example.test`;
    await createRegistration(prisma, {
      event,
      email,
      terms: [{ term: terms[0], status: 'confirmed' }],
    });

    await expect(
      createRegistration(prisma, {
        event,
        email: email.toUpperCase(),
        terms: [{ term: terms[1], status: 'confirmed' }],
      }),
    ).rejects.toThrow(/Unique constraint/);
  });

  it('keeps a separate outcome per term', async () => {
    const { event, terms } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
      terms: SUMMER,
    });
    const registration = await createRegistration(prisma, {
      event,
      terms: [
        { term: terms[0], status: 'confirmed' },
        { term: terms[1], status: 'waitlisted' },
      ],
    });

    const outcomes = await prisma.registrationTerm.findMany({
      where: { registrationId: registration.id },
      orderBy: { term: { startDate: 'asc' } },
      select: { status: true },
    });
    expect(outcomes.map(({ status }) => status)).toEqual([
      'confirmed',
      'waitlisted',
    ]);
  });

  it('cannot select a term of another event', async () => {
    const organizationId = (await createOrganization(prisma)).id;
    const own = await createEvent(prisma, { organizationId, terms: SUMMER });
    const other = await createEvent(prisma, { organizationId, terms: SUMMER });
    const registration = await createRegistration(prisma, {
      event: own.event,
      terms: [{ term: own.terms[0], status: 'confirmed' }],
    });

    await expect(
      prisma.registrationTerm.create({
        data: {
          registrationId: registration.id,
          termId: other.terms[1].id,
          eventId: own.event.id,
          status: 'confirmed',
          priceMinor: 0,
          decidedAt: new Date(),
        },
      }),
    ).rejects.toThrow(/Foreign key constraint/);
  });

  it('cannot belong to an organization other than its event', async () => {
    const { event, terms } = await createEvent(prisma, {
      organizationId: (await createOrganization(prisma)).id,
      terms: SUMMER,
    });
    const foreign = await createOrganization(prisma);

    await expect(
      createRegistration(prisma, {
        event: { ...event, organizationId: foreign.id },
        terms: [{ term: terms[0], status: 'confirmed' }],
      }),
    ).rejects.toThrow(/Foreign key constraint/);
  });

  it('cannot be deleted while it has payments, nor can its terms', async () => {
    const organizer = await createOrganizer(prisma);
    const { event, terms } = await createEvent(prisma, {
      organizationId: (
        await createOrganization(prisma, { ownerId: organizer.id })
      ).id,
      terms: SUMMER,
    });
    const registration = await createRegistration(prisma, {
      event,
      terms: [{ term: terms[0], status: 'confirmed' }],
    });
    await createPayment(prisma, {
      registration,
      recordedById: organizer.id,
      amountMinor: 100,
    });

    await expect(
      prisma.eventTerm.delete({ where: { id: terms[0].id } }),
    ).rejects.toThrow(/Foreign key constraint/);
    await expect(
      prisma.registration.delete({ where: { id: registration.id } }),
    ).rejects.toThrow(/Foreign key constraint/);
  });
});

describe('payment', () => {
  const setup = async (): Promise<{
    organizerId: string;
    registration: Awaited<ReturnType<typeof createRegistration>>;
  }> => {
    const organizer = await createOrganizer(prisma);
    const organization = await createOrganization(prisma, {
      ownerId: organizer.id,
    });
    const { event, terms } = await createEvent(prisma, {
      organizationId: organization.id,
      terms: SUMMER,
    });
    const registration = await createRegistration(prisma, {
      event,
      terms: [{ term: terms[0], status: 'confirmed' }],
    });
    return { organizerId: organizer.id, registration };
  };

  it('rejects a non-positive amount', async () => {
    const { organizerId, registration } = await setup();

    for (const amountMinor of [0, -100]) {
      await expect(
        createPayment(prisma, {
          registration,
          recordedById: organizerId,
          amountMinor,
        }),
      ).rejects.toThrow(/payment_amount_chk/);
    }
  });

  it('records a double submit at most once', async () => {
    const { organizerId, registration } = await setup();
    const payment = await createPayment(prisma, {
      registration,
      recordedById: organizerId,
      amountMinor: 50_000,
    });

    await expect(
      prisma.payment.create({
        data: {
          organizationId: payment.organizationId,
          registrationId: payment.registrationId,
          submissionKey: payment.submissionKey,
          amountMinor: payment.amountMinor,
          receivedOn: payment.receivedOn,
          recordedById: organizerId,
        },
      }),
    ).rejects.toThrow(/Unique constraint/);
  });

  it('cannot be attached to another organization', async () => {
    const { organizerId, registration } = await setup();
    const foreign = await createOrganization(prisma);

    await expect(
      createPayment(prisma, {
        registration: { ...registration, organizationId: foreign.id },
        recordedById: organizerId,
        amountMinor: 100,
      }),
    ).rejects.toThrow(/Foreign key constraint/);
  });
});
