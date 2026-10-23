import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { PublicRegistrationsController } from '@/modules/registrations/controllers/public-registrations.controller';
import { RegistrationsRepository } from '@/modules/registrations/repositories/registrations.repository';
import { RegistrationConfirmationService } from '@/modules/registrations/services/registration-confirmation.service';
import { RegistrationsService } from '@/modules/registrations/services/registrations.service';
import { RoomsRepository } from '@/modules/rooms/repositories/rooms.repository';
import { RoomsService } from '@/modules/rooms/services/rooms.service';
import { confirmationProviders, Mailbox } from '@/testing/confirmation-mail';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  RoomInput,
  TermInput,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// react-email's renderer cannot load under jest (see `render-markup.ts`), so
// the props are rendered as JSON; the template itself has its own spec.
jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: object): Promise<string> =>
    Promise.resolve(JSON.stringify(props)),
}));

// S2-08 through the public HTTP API against a real database: validation, the
// event and term locks, the per-term decision, uniqueness and retries, and
// what is stored. No sign-in is involved. Concurrency is real: requests are
// fired together and queue on the row locks.
// Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;
let rooms: RoomsService;
let confirmation: RegistrationConfirmationService;
const mailbox = new Mailbox();

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [PublicRegistrationsController],
    providers: [
      RegistrationsService,
      RegistrationsRepository,
      RoomsService,
      RoomsRepository,
      ...confirmationProviders(mailbox),
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
  rooms = app.get(RoomsService);
  confirmation = app.get(RegistrationConfirmationService);
});

afterAll(() => app.close());

// Response bodies are asserted field by field; typing every DTO here adds nothing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

const submit = async (publicId: string, body: unknown): Promise<Call> => {
  const response = await fetch(
    `${baseUrl}/public/events/${publicId}/registrations`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const T1: TermInput = {
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  label: 'T1',
  priceMinor: 450_050,
};
const T2: TermInput = {
  startDate: '2027-07-15',
  endDate: '2027-07-21',
  label: 'T2',
  priceMinor: 390_000,
};

type EventFixture = CreatedEvent & {
  publicId: string;
  termIds: string[];
  scope: EventScope;
};

type FormBody = {
  submissionKey: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  termIds: string[];
};

const eventWith = async (
  options: {
    terms?: TermInput[];
    rooms?: RoomInput[];
    status?: 'draft' | 'open' | 'closed';
  } = {},
): Promise<EventFixture> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: options.status ?? 'open',
    terms: options.terms ?? [T1, T2],
    rooms: options.rooms ?? [],
  });
  return {
    ...created,
    publicId: created.event.publicId,
    termIds: created.terms.map((term) => term.id),
    scope: {
      organizationId: organization.id,
      ownerId: organization.ownerId,
      eventId: created.event.id,
    },
  };
};

const form = (
  termIds: string[],
  overrides: Record<string, unknown> = {},
): FormBody => ({
  submissionKey: randomUUID(),
  firstName: 'Jana',
  lastName: 'Nováková',
  email: `jana-${randomUUID().slice(0, 8)}@example.test`,
  phone: '+420 777 123 456',
  termIds,
  ...overrides,
});

const statusesOf = (body: {
  terms: { label: string; status: string }[];
}): Record<string, string> =>
  Object.fromEntries(body.terms.map((term) => [term.label, term.status]));

const confirmedIn = (termId: string): Promise<number> =>
  prisma.registrationTerm.count({ where: { termId, status: 'confirmed' } });

const registrationsOf = (eventId: string): Promise<number> =>
  prisma.registration.count({ where: { eventId } });

// Earlier tests do not wait for their e-mail; let it land before the next one starts.
beforeEach(async () => {
  await confirmation.settle();
  mailbox.reset();
});

describe('saving a registration', () => {
  it('stores the submission with a decision per term and records one confirmation e-mail', async () => {
    const f = await eventWith({ rooms: [{ bedCount: 1, termIndexes: [0] }] });
    const body = form(f.termIds, { email: '  Jana.Novakova@Example.TEST ' });

    const response = await submit(f.publicId, body);

    expect(response.status).toBe(201);
    expect(statusesOf(response.body)).toEqual({
      T1: 'confirmed',
      T2: 'waitlisted',
    });
    expect(response.body).toMatchObject({
      firstName: 'Jana',
      lastName: 'Nováková',
      email: 'Jana.Novakova@Example.TEST',
      phone: '+420777123456',
      selectedPriceMinor: 840_050,
    });
    expect(
      response.body.terms.map((term: { label: string }) => term.label),
    ).toEqual(['T1', 'T2']);
    expect(response.body).not.toHaveProperty('capacity');

    await confirmation.settle();
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: response.body.id },
      include: { terms: true, participantAccount: true, emails: true },
    });
    expect(stored).toMatchObject({
      eventId: f.event.id,
      organizationId: f.event.organizationId,
      submissionKey: body.submissionKey,
      email: 'Jana.Novakova@Example.TEST',
      phone: '+420777123456',
      bankAccountNumber: f.event.bankAccountNumber,
      bankCode: f.event.bankCode,
      paymentReminderDays: f.event.paymentReminderDays,
      paymentReminderAt: expect.any(Date),
    });
    expect(stored.variableSymbol).toMatch(/^\d{1,10}$/);
    expect(stored.participantAccount.email).toBe('jana.novakova@example.test');
    expect(
      stored.terms.map(({ termId, priceMinor }) => ({ termId, priceMinor })),
    ).toEqual(
      expect.arrayContaining([
        { termId: f.termIds[0], priceMinor: 450_050 },
        { termId: f.termIds[1], priceMinor: 390_000 },
      ]),
    );
    expect(stored.emails).toEqual([
      expect.objectContaining({
        type: 'registration_confirmation',
        status: 'accepted',
        recipientEmail: 'Jana.Novakova@Example.TEST',
      }),
    ]);
  });

  it('saves a registration without any free bed as waitlisted, not as an error', async () => {
    const f = await eventWith();

    const response = await submit(f.publicId, form(f.termIds));

    expect(response.status).toBe(201);
    expect(statusesOf(response.body)).toEqual({
      T1: 'waitlisted',
      T2: 'waitlisted',
    });
  });

  it('confirms a free term at 0 Kč and lets a waitlisted participant hold no bed', async () => {
    const f = await eventWith({
      terms: [{ ...T1, priceMinor: 0 }],
      rooms: [{ bedCount: 1, termIndexes: [0] }],
    });

    const first = await submit(f.publicId, form(f.termIds));
    const second = await submit(f.publicId, form(f.termIds));
    const third = await submit(f.publicId, form(f.termIds));

    expect(first.body).toMatchObject({ selectedPriceMinor: 0 });
    expect(statusesOf(first.body)).toEqual({ T1: 'confirmed' });
    expect(statusesOf(second.body)).toEqual({ T1: 'waitlisted' });
    expect(statusesOf(third.body)).toEqual({ T1: 'waitlisted' });
    expect(await confirmedIn(f.termIds[0])).toBe(1);
  });

  it('confirms a selection of one term only in that term', async () => {
    const f = await eventWith({
      rooms: [{ bedCount: 1, termIndexes: [0, 1] }],
    });

    await submit(f.publicId, form([f.termIds[1]]));
    const response = await submit(f.publicId, form(f.termIds));

    expect(statusesOf(response.body)).toEqual({
      T1: 'confirmed',
      T2: 'waitlisted',
    });
  });
});

describe('payment obligation (S2-16)', () => {
  const oneBed = [{ bedCount: 1, termIndexes: [0] }];

  it('owes the confirmed terms only and returns amount, account, VS and reminder date', async () => {
    const f = await eventWith({
      terms: [
        { ...T1, priceMinor: 100_000 },
        { ...T2, priceMinor: 200_000 },
      ],
      rooms: oneBed,
    });

    const response = await submit(f.publicId, form(f.termIds));

    expect(statusesOf(response.body)).toEqual({
      T1: 'confirmed',
      T2: 'waitlisted',
    });
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: response.body.id },
      include: { terms: true },
    });
    expect(response.body.amountDueMinor).toBe(100_000);
    expect(response.body.paymentInstructions).toEqual({
      amountMinor: 100_000,
      variableSymbol: stored.variableSymbol,
      account: { prefix: null, number: '123457', bankCode: '0100' },
      reminderAt: stored.paymentReminderAt?.toISOString(),
    });
    const decidedAt = stored.terms[0].decidedAt.getTime();
    const days = (stored.paymentReminderAt!.getTime() - decidedAt) / 86_400_000;
    // 14 calendar days, give or take the hour of a DST change
    expect(Math.abs(days - 14)).toBeLessThanOrEqual(1 / 24);
  });

  it.each([
    ['only waitlisted terms', { rooms: [] }],
    [
      'only confirmed free terms',
      { terms: [{ ...T1, priceMinor: 0 }], rooms: oneBed },
    ],
  ])(
    'has no obligation, reminder date or payment request for %s',
    async (_, options) => {
      const f = await eventWith(options);

      const response = await submit(f.publicId, form(f.termIds));

      expect(response.body.amountDueMinor).toBe(0);
      expect(response.body.paymentInstructions).toBeNull();
      const stored = await prisma.registration.findUniqueOrThrow({
        where: { id: response.body.id },
      });
      expect(stored.paymentReminderAt).toBeNull();
    },
  );

  it('gives every registration its own VS', async () => {
    const f = await eventWith({ rooms: [{ bedCount: 5, termIndexes: [0] }] });

    const responses = await Promise.all(
      [1, 2, 3].map(() => submit(f.publicId, form(f.termIds))),
    );

    const symbols = responses.map(
      (response) => response.body.paymentInstructions.variableSymbol,
    );
    expect(new Set(symbols).size).toBe(3);
  });

  it('keeps the instructions of a repeat and of an existing registration after the settings change', async () => {
    const f = await eventWith({ rooms: oneBed });
    const body = form(f.termIds);
    const original = await submit(f.publicId, body);

    await prisma.event.update({
      where: { id: f.event.id },
      data: {
        bankAccountNumber: '999999',
        bankCode: '0800',
        paymentReminderDays: 3,
      },
    });
    const repeated = await submit(f.publicId, body);
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: original.body.id },
    });

    expect(repeated).toEqual({ status: 200, body: original.body });
    expect(stored).toMatchObject({
      bankAccountNumber: '123457',
      bankCode: '0100',
      paymentReminderDays: 14,
      variableSymbol: original.body.paymentInstructions.variableSymbol,
    });
    expect(stored.paymentReminderAt?.toISOString()).toBe(
      original.body.paymentInstructions.reminderAt,
    );

    const later = await submit(f.publicId, form([f.termIds[1]]));
    expect(later.body.paymentInstructions).toBeNull();
  });
});

describe('the last bed under concurrency', () => {
  it('confirms exactly one of many simultaneous registrations and saves them all', async () => {
    const f = await eventWith({
      terms: [T1],
      rooms: [{ bedCount: 1, termIndexes: [0] }],
    });

    const responses = await Promise.all(
      Array.from({ length: 8 }, () => submit(f.publicId, form(f.termIds))),
    );

    expect(responses.map((response) => response.status)).toEqual(
      Array(8).fill(201),
    );
    const statuses = responses.map((response) => response.body.terms[0].status);
    expect(statuses.filter((status) => status === 'confirmed')).toHaveLength(1);
    expect(await confirmedIn(f.termIds[0])).toBe(1);
    expect(await registrationsOf(f.event.id)).toBe(8);
  });

  it('never confirms more than the capacity left by a concurrent room change', async () => {
    const f = await eventWith({
      terms: [T1],
      rooms: [{ bedCount: 2, termIndexes: [0] }],
    });
    const roomId = f.rooms[0].id;

    const [shrink, ...submits] = await Promise.allSettled([
      rooms.update(f.scope, roomId, {
        label: 'Room 1',
        bedCount: 1,
        termIds: f.termIds,
      }),
      ...Array.from({ length: 4 }, () => submit(f.publicId, form(f.termIds))),
    ]);

    for (const result of submits) {
      expect(result).toMatchObject({
        status: 'fulfilled',
        value: { status: 201 },
      });
    }
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    const confirmed = await confirmedIn(f.termIds[0]);
    expect(confirmed).toBeLessThanOrEqual(room.bedCount);
    // The shrink either went first (1 confirmation) or was refused because
    // two beds were already confirmed.
    expect(
      shrink.status === 'fulfilled'
        ? room.bedCount === 1 && confirmed === 1
        : room.bedCount === 2 && confirmed === 2,
    ).toBe(true);
  });
});

describe('one registration per e-mail and event', () => {
  it('saves only one of simultaneous submissions of the same e-mail, in any case or spacing', async () => {
    const f = await eventWith({
      rooms: [{ bedCount: 5, termIndexes: [0, 1] }],
    });
    const email = `dup-${randomUUID().slice(0, 8)}@example.test`;
    const variants = [email, email.toUpperCase(), ` ${email} `, email];

    const responses = await Promise.all(
      variants.map((variant) =>
        submit(f.publicId, form(f.termIds, { email: variant })),
      ),
    );

    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    for (const refused of responses.filter((r) => r.status !== 201)) {
      expect(refused).toEqual({
        status: 409,
        body: {
          statusCode: 409,
          code: 'already_registered',
          field: 'email',
          message: 'Přihláška s tímto e-mailem na tuto akci již existuje.',
        },
      });
    }
    expect(await registrationsOf(f.event.id)).toBe(1);
    expect(await confirmedIn(f.termIds[0])).toBe(1);
  });

  it('does not change the existing registration and reveals nothing of it', async () => {
    const f = await eventWith({ rooms: [{ bedCount: 1, termIndexes: [0] }] });
    const original = await submit(f.publicId, form([f.termIds[0]]));

    const again = await submit(
      f.publicId,
      form(f.termIds, {
        email: original.body.email,
        firstName: 'Jiná',
        phone: '+421 905 123 456',
      }),
    );

    expect(again.status).toBe(409);
    expect(JSON.stringify(again.body)).not.toContain(original.body.id);
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: original.body.id },
      include: { terms: true },
    });
    expect(stored.firstName).toBe('Jana');
    expect(stored.terms).toHaveLength(1);
    expect(await registrationsOf(f.event.id)).toBe(1);
    expect(
      await prisma.emailDelivery.count({
        where: { recipientEmail: original.body.email },
      }),
    ).toBe(1);
  });

  it('lets the same e-mail register for another event', async () => {
    const first = await eventWith();
    const second = await eventWith();
    const email = `twice-${randomUUID().slice(0, 8)}@example.test`;

    const a = await submit(first.publicId, form(first.termIds, { email }));
    const b = await submit(second.publicId, form(second.termIds, { email }));

    expect([a.status, b.status]).toEqual([201, 201]);
    expect(await prisma.participantAccount.count({ where: { email } })).toBe(1);
  });
});

describe('repeating a submission', () => {
  it('returns the stored result for the same key and content, even after capacity and state changed', async () => {
    const f = await eventWith({ rooms: [{ bedCount: 1, termIndexes: [0] }] });
    const body = form(f.termIds);
    const original = await submit(f.publicId, body);

    // Capacity grows (T2 would now confirm) and the event leaves `open`.
    await prisma.room.create({
      data: { eventId: f.event.id, label: 'Extra', bedCount: 3 },
    });
    await prisma.event.update({
      where: { id: f.event.id },
      data: { status: 'closed' },
    });
    const repeated = await submit(f.publicId, {
      ...body,
      phone: '+420777123456',
      termIds: [...f.termIds].reverse(),
    });

    expect(repeated).toEqual({ status: 200, body: original.body });
    expect(await registrationsOf(f.event.id)).toBe(1);
    expect(
      await prisma.emailDelivery.count({
        where: { registrationId: original.body.id },
      }),
    ).toBe(1);
  });

  it('refuses the same key with changed content and keeps what was saved', async () => {
    const f = await eventWith({
      rooms: [{ bedCount: 2, termIndexes: [0, 1] }],
    });
    const body = form([f.termIds[0]]);
    const original = await submit(f.publicId, body);

    const changed = await submit(f.publicId, { ...body, termIds: f.termIds });
    const otherEvent = await eventWith();
    const elsewhere = await submit(otherEvent.publicId, {
      ...body,
      termIds: otherEvent.termIds,
    });

    for (const refused of [changed, elsewhere]) {
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('submission_key_reused');
    }
    const stored = await prisma.registrationTerm.findMany({
      where: { registrationId: original.body.id },
    });
    expect(stored.map((term) => term.termId)).toEqual([f.termIds[0]]);
    expect(await registrationsOf(otherEvent.event.id)).toBe(0);
  });

  it('saves one registration when the same submission arrives several times at once', async () => {
    const f = await eventWith({ rooms: [{ bedCount: 1, termIndexes: [0] }] });
    const body = form(f.termIds);

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => submit(f.publicId, body)),
    );

    expect(responses.map((r) => r.status).sort()).toEqual([200, 200, 200, 201]);
    expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
    expect(await registrationsOf(f.event.id)).toBe(1);
    expect(await confirmedIn(f.termIds[0])).toBe(1);
  });

  it('decides a retry of an unsaved submission against the current event', async () => {
    const f = await eventWith({ status: 'draft' });
    const body = form(f.termIds);

    expect((await submit(f.publicId, body)).status).toBe(404);
    await prisma.event.update({
      where: { id: f.event.id },
      data: { status: 'open', firstOpenedAt: new Date() },
    });
    const retried = await submit(f.publicId, body);

    expect(retried.status).toBe(201);
    expect(await registrationsOf(f.event.id)).toBe(1);
  });
});

describe('refused submissions save nothing', () => {
  it('answers 404 alike for a draft, a closed and an unknown event', async () => {
    const draft = await eventWith({ status: 'draft' });
    const closed = await eventWith({ status: 'closed' });

    const responses = [
      await submit(draft.publicId, form(draft.termIds)),
      await submit(closed.publicId, form(closed.termIds)),
      await submit('nonexistent12', form([randomUUID()])),
      await submit('x y', form([randomUUID()])),
    ];

    for (const response of responses) {
      expect(response).toEqual({
        status: 404,
        body: {
          statusCode: 404,
          code: 'event_unavailable',
          message: 'Přihlašování na tuto akci není dostupné.',
        },
      });
    }
    expect(await registrationsOf(draft.event.id)).toBe(0);
    expect(await registrationsOf(closed.event.id)).toBe(0);
  });

  it('refuses a term of another event', async () => {
    const f = await eventWith({ rooms: [{ bedCount: 1, termIndexes: [0] }] });
    const other = await eventWith();
    const body = form([f.termIds[0], other.termIds[0]]);

    const response = await submit(f.publicId, body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'term_unknown',
      field: 'termIds',
    });
    expect(await registrationsOf(f.event.id)).toBe(0);
    expect(
      await prisma.participantAccount.count({ where: { email: body.email } }),
    ).toBe(0);
  });

  it('rolls everything back when saving fails part-way and lets the retry succeed', async () => {
    const f = await eventWith({
      rooms: [{ bedCount: 1, termIndexes: [0, 1] }],
    });
    const body = form(f.termIds, {
      email: `fail-${randomUUID().slice(0, 8)}@example.test`,
    });
    // Fails the last insert of the transaction, after the registration and its
    // terms were written.
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION test_fail_email() RETURNS trigger AS $$
      BEGIN
        IF NEW."recipientEmail" LIKE 'fail-%' THEN RAISE EXCEPTION 'injected failure'; END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER test_fail_email BEFORE INSERT ON "email_delivery"
      FOR EACH ROW EXECUTE FUNCTION test_fail_email()`);
    let failed: Call;
    try {
      failed = await submit(f.publicId, body);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER test_fail_email ON "email_delivery"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION test_fail_email()`);
    }

    expect(failed.status).toBe(500);
    expect(await registrationsOf(f.event.id)).toBe(0);
    expect(
      await prisma.registrationTerm.count({ where: { eventId: f.event.id } }),
    ).toBe(0);
    expect(
      await prisma.participantAccount.count({ where: { email: body.email } }),
    ).toBe(0);

    const retried = await submit(f.publicId, body);
    expect(retried.status).toBe(201);
    expect(statusesOf(retried.body)).toEqual({
      T1: 'confirmed',
      T2: 'confirmed',
    });
  });
});

describe('validation', () => {
  it.each([
    ['without a term', { termIds: [] }, 'Vyberte alespoň jeden termín.'],
    ['without a first name', { firstName: '  ' }, 'Vyplňte jméno.'],
    ['without a last name', { lastName: undefined }, 'Vyplňte příjmení.'],
    ['with an invalid e-mail', { email: 'jana@' }, 'Zadejte platný e-mail.'],
    [
      'with a phone without the prefix',
      { phone: '777 123 456' },
      'Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456.',
    ],
    [
      'with a phone that cannot exist',
      { phone: '+420 12' },
      'Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456.',
    ],
    [
      'with a price from the client',
      { priceMinor: 0 },
      'property priceMinor should not exist',
    ],
  ])('refuses a form %s', async (_, overrides, message) => {
    const f = await eventWith();

    const response = await submit(f.publicId, form(f.termIds, overrides));

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(message);
    expect(await registrationsOf(f.event.id)).toBe(0);
  });

  it.each([
    ['+420 777 123 456', '+420777123456'],
    ['+44 7911 123456', '+447911123456'],
    ['+49 30 901820', '+4930901820'],
  ])('accepts the phone %s and stores %s', async (phone, stored) => {
    const f = await eventWith();

    const response = await submit(f.publicId, form(f.termIds, { phone }));

    expect(response.status).toBe(201);
    expect(response.body.phone).toBe(stored);
  });
});

describe('confirmation e-mail (S2-15)', () => {
  type Sent = {
    eventName: string;
    terms: { label: string; status: string; priceMinor: number }[];
    selectedPriceMinor: number;
    payment: {
      amountMinor: number;
      variableSymbol: string;
      account: { number: string; bankCode: string };
      reminderAt: string;
    } | null;
    url: string;
  };

  const lastMail = (): { to: string; subject: string; props: Sent } => {
    const mail = mailbox.sent[mailbox.sent.length - 1];
    return {
      to: mail.to,
      subject: mail.subject,
      props: JSON.parse(mail.html) as Sent,
    };
  };

  const tokenOf = (url: string): string =>
    new URL(url).searchParams.get('token') as string;

  it('sends the saved result to the contact e-mail, with a link that opens the participant list', async () => {
    const f = await eventWith({ rooms: [{ bedCount: 1, termIndexes: [0] }] });
    const email = `mixed-${randomUUID().slice(0, 8)}@example.test`;

    const response = await submit(f.publicId, form(f.termIds, { email }));
    await confirmation.settle();

    expect(mailbox.sent).toHaveLength(1);
    const { to, subject, props } = lastMail();
    expect(to).toBe(email);
    expect(subject).toBe(`akc.io — přihláška přijata: ${f.event.name}`);
    expect(props.eventName).toBe(f.event.name);
    expect(props.terms).toEqual([
      expect.objectContaining({
        label: 'T1',
        status: 'confirmed',
        priceMinor: 450_050,
      }),
      expect.objectContaining({
        label: 'T2',
        status: 'waitlisted',
        priceMinor: 390_000,
      }),
    ]);
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    // The price of the selection is not the amount to pay: the waitlisted term owes nothing.
    expect(props.selectedPriceMinor).toBe(840_050);
    expect(props.payment).toMatchObject({
      amountMinor: 450_050,
      variableSymbol: stored.variableSymbol,
      account: { number: '123457' },
    });
    expect(new Date(props.payment!.reminderAt)).toEqual(
      stored.paymentReminderAt,
    );

    // The link is single-use and signs the participant in; the e-mail is
    // not stored, only the hash of the token.
    const access = app.get(ParticipantAccessService);
    const session = await access.openSession(tokenOf(props.url));
    expect(await access.identify(session.token)).toMatchObject({
      email: email,
    });
    await expect(access.openSession(tokenOf(props.url))).rejects.toMatchObject({
      response: { code: 'magic_link_invalid' },
    });
    const delivery = await prisma.emailDelivery.findFirstOrThrow({
      where: { registrationId: response.body.id },
    });
    expect(delivery).toMatchObject({
      status: 'accepted',
      providerMessageId: 'msg-1',
      errorMessage: null,
    });
  });

  it('asks for no payment from a waitlisted-only or free result', async () => {
    const waitlisted = await eventWith();
    await submit(waitlisted.publicId, form(waitlisted.termIds));
    const free = await eventWith({
      terms: [{ ...T1, priceMinor: 0 }],
      rooms: [{ bedCount: 1, termIndexes: [0] }],
    });
    const freeResponse = await submit(free.publicId, form(free.termIds));
    await confirmation.settle();

    expect(mailbox.sent).toHaveLength(2);
    for (const mail of mailbox.sent) {
      expect((JSON.parse(mail.html) as Sent).payment).toBeNull();
    }
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: freeResponse.body.id },
    });
    expect(stored.paymentReminderAt).toBeNull();
  });

  it('keeps the registration and records a failure without the token when sending fails', async () => {
    const f = await eventWith({ rooms: [{ bedCount: 1, termIndexes: [0] }] });
    mailbox.failWith = 'provider rejected the message';
    mailbox.echoBodyInError = true;

    const response = await submit(f.publicId, form(f.termIds));
    await confirmation.settle();

    expect(response.status).toBe(201);
    expect(await registrationsOf(f.event.id)).toBe(1);
    const delivery = await prisma.emailDelivery.findFirstOrThrow({
      where: { registrationId: response.body.id },
    });
    expect(delivery.status).toBe('failed');
    expect(delivery.errorMessage).toContain('provider rejected the message');
    const link = await prisma.participantMagicLink.findFirstOrThrow({
      where: { participantAccountId: delivery.participantAccountId! },
    });
    expect(link.consumedAt).toBeNull();
    // Nothing that could open the account may reach the log row.
    expect(delivery.errorMessage).not.toMatch(/token=|[A-Za-z0-9_-]{43}/);

    // No automatic retry, and the failed row is not queued again.
    await confirmation.settle();
    expect(mailbox.sent).toHaveLength(0);
    expect(
      await prisma.emailDelivery.count({
        where: { registrationId: response.body.id },
      }),
    ).toBe(1);
  });

  it('does not send for a repeat, a duplicate or a rolled-back submission', async () => {
    const f = await eventWith({
      rooms: [{ bedCount: 2, termIndexes: [0, 1] }],
    });
    const body = form(f.termIds);

    const first = await submit(f.publicId, body);
    const repeat = await submit(f.publicId, body);
    const duplicate = await submit(
      f.publicId,
      form(f.termIds, { email: body.email.toUpperCase() }),
    );
    const unknownTerm = await submit(
      f.publicId,
      form([randomUUID()], {
        email: `rolled-${randomUUID().slice(0, 8)}@example.test`,
      }),
    );
    await confirmation.settle();

    expect([
      first.status,
      repeat.status,
      duplicate.status,
      unknownTerm.status,
    ]).toEqual([201, 200, 409, 400]);
    expect(mailbox.sent).toHaveLength(1);
    expect(
      await prisma.emailDelivery.count({
        where: { registrationId: first.body.id },
      }),
    ).toBe(1);
  });

  it('does not send for an event that is not open', async () => {
    const f = await eventWith({ status: 'draft' });
    const response = await submit(f.publicId, form(f.termIds));
    await confirmation.settle();

    expect(response.status).toBe(404);
    expect(mailbox.sent).toHaveLength(0);
  });
});
