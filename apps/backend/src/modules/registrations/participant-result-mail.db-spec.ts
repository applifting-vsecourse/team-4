import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import {
  ResultEventPayload,
  resultPayload,
} from '@/modules/accommodation/domain/term-decision';
import { ParticipantUpdatePayload } from '@/modules/registrations/domain/participant-update';
import { ParticipantResultMailService } from '@/modules/registrations/services/participant-result-mail.service';
import { ParticipantUpdateService } from '@/modules/registrations/services/participant-update.service';
import { Mailbox, updateProviders } from '@/testing/confirmation-mail';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// react-email's renderer cannot load under jest (see `render-markup.ts`), so
// the props are rendered as JSON; the template has its own spec.
jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: object): Promise<string> =>
    Promise.resolve(JSON.stringify(props)),
}));

// F45-1 for the result events of S3-02 against a real database: one decision
// gives one message, a re-scan none, the message is the decision's own
// snapshot, and a failure never touches the decision. Needs a migrated
// Postgres in DATABASE_URL: `pnpm backend test:db`.

let app: INestApplication;
let prisma: PrismaService;
let results: ParticipantResultMailService;
let updates: ParticipantUpdateService;
const mailbox = new Mailbox();

beforeAll(async () => {
  process.env.RESULT_MAIL_INTERVAL_MS = '0';
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    providers: [ParticipantResultMailService, ...updateProviders(mailbox)],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = app.get(PrismaService);
  results = app.get(ParticipantResultMailService);
  updates = app.get(ParticipantUpdateService);

  // The database is shared: the decision specs that ran before leave many
  // result events behind. Mark them handled (as the backfill migration does),
  // so every scan here deals with this spec's own events only.
  await prisma.$executeRaw`
    INSERT INTO "email_delivery"
      ("id", "type", "status", "recipientEmail", "registrationId",
       "participantAccountId", "dedupKey", "errorMessage", "updatedAt")
    SELECT gen_random_uuid(), 'participant_update', 'failed', r."email", r."id",
           r."participantAccountId", 'result:' || e."id"::text,
           'Left over from another spec', now()
    FROM "registration_result_event" e
    JOIN "registration" r ON r."id" = e."registrationId"
    ON CONFLICT ("dedupKey") DO NOTHING`;
});

beforeEach(() => mailbox.reset());

afterAll(() => app.close());

type Fixture = CreatedEvent & { registration: Registration };

const T1 = {
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  label: 'T1',
  priceMinor: 300_000,
};
const T2 = {
  startDate: '2027-07-15',
  endDate: '2027-07-21',
  label: 'T2',
  priceMinor: 150_000,
};

const setup = async (
  statuses: ('confirmed' | 'waitlisted')[],
): Promise<Fixture> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [T1, T2].slice(0, statuses.length),
  });
  const registration = await createRegistration(prisma, {
    event: created.event,
    terms: statuses.map((status, index) => ({
      term: created.terms[index],
      status,
    })),
  });
  return { ...created, registration };
};

/** What S3-02 writes when a decision is saved. */
const decide = async (
  fixture: Fixture,
  overrides: Partial<Parameters<typeof resultPayload>[0]> = {},
): Promise<{ id: string; payload: ResultEventPayload }> => {
  const terms = fixture.terms.map((term, index) => ({
    termId: term.id,
    label: term.label,
    startDate: term.startDate.toISOString().slice(0, 10),
    endDate: term.endDate.toISOString().slice(0, 10),
    status: 'confirmed' as const,
    priceMinor: [T1, T2][index].priceMinor,
  }));
  const payload = resultPayload({
    decided: [{ termId: terms[0].termId, from: 'pending', to: 'confirmed' }],
    terms,
    paidMinor: 0,
    variableSymbol: fixture.registration.variableSymbol,
    reminderAt: new Date('2027-06-14T22:00:00Z'),
    ...overrides,
  });
  const event = await prisma.registrationResultEvent.create({
    data: {
      eventId: fixture.event.id,
      registrationId: fixture.registration.id,
      batchId: randomUUID(),
      payload: payload as never,
    },
  });
  return { id: event.id, payload };
};

const scan = async (): Promise<number> => {
  const queued = await results.scan();
  await updates.settle();
  return queued;
};

const sent = (): { to: string; update: ParticipantUpdatePayload }[] =>
  mailbox.sent.map((mail) => ({
    to: mail.to,
    update: (JSON.parse(mail.html) as { update: ParticipantUpdatePayload })
      .update,
  }));

const deliveries = (eventId: string) =>
  prisma.emailDelivery.findMany({ where: { dedupKey: `result:${eventId}` } });

describe('a decision result', () => {
  it('gives exactly one message, and a re-scan gives none', async () => {
    const fixture = await setup(['confirmed']);
    const event = await decide(fixture);

    expect(await scan()).toBeGreaterThanOrEqual(1);
    expect(await scan()).toBe(0);

    const mails = sent().filter((m) => m.to === fixture.registration.email);
    expect(mails).toHaveLength(1);
    expect(await deliveries(event.id)).toHaveLength(1);
    expect((await deliveries(event.id))[0].status).toBe('accepted');
  });

  it('confirms with the payment details of the decision', async () => {
    const fixture = await setup(['confirmed']);
    await decide(fixture);

    await scan();

    const [{ update }] = sent().filter(
      (m) => m.to === fixture.registration.email,
    );
    expect(update.reason).toBe('evaluation');
    expect(update.terms.map((t) => t.status)).toEqual(['confirmed']);
    expect(update.payment.balanceMinor).toBe(300_000);
    expect(update.payment.bank?.variableSymbol).toBe(
      fixture.registration.variableSymbol,
    );
    expect(update.payment.bank?.reminderAt).toBe('2027-06-14T22:00:00.000Z');
  });

  it('tells a waitlisted participant without any payment data', async () => {
    const fixture = await setup(['waitlisted']);
    await decide(fixture, {
      decided: [],
      terms: fixture.terms.map((term) => ({
        termId: term.id,
        label: term.label,
        startDate: '2027-07-01',
        endDate: '2027-07-07',
        status: 'waitlisted' as const,
        priceMinor: 300_000,
      })),
      reminderAt: null,
    });

    await scan();

    const [{ update }] = sent().filter(
      (m) => m.to === fixture.registration.email,
    );
    expect(update.terms.map((t) => t.status)).toEqual(['waitlisted']);
    expect(update.payment.balanceMinor).toBe(0);
    expect(update.payment.receivedMinor).toBe(0);
  });

  it('is the freed-place message when a waitlisted term is confirmed', async () => {
    const fixture = await setup(['confirmed', 'waitlisted']);
    await decide(fixture, {
      decided: [
        { termId: fixture.terms[1].id, from: 'waitlisted', to: 'confirmed' },
      ],
    });

    await scan();

    const [{ update }] = sent().filter(
      (m) => m.to === fixture.registration.email,
    );
    expect(update.reason).toBe('waitlistConfirmed');
  });

  it('keeps each term state of a mixed result', async () => {
    const fixture = await setup(['confirmed', 'waitlisted']);
    const base = (i: number) => ({
      termId: fixture.terms[i].id,
      label: fixture.terms[i].label,
      startDate: '2027-07-01',
      endDate: '2027-07-07',
      priceMinor: [T1, T2][i].priceMinor,
    });
    await decide(fixture, {
      terms: [
        { ...base(0), status: 'confirmed' },
        { ...base(1), status: 'waitlisted' },
      ],
    });

    await scan();

    const [{ update }] = sent().filter(
      (m) => m.to === fixture.registration.email,
    );
    expect(update.terms.map((t) => t.status)).toEqual([
      'confirmed',
      'waitlisted',
    ]);
    // Only the confirmed term is owed.
    expect(update.payment.balanceMinor).toBe(300_000);
  });

  it('is the snapshot of the decision, not of the registration now', async () => {
    const fixture = await setup(['confirmed']);
    await decide(fixture);
    await prisma.registrationTerm.updateMany({
      where: { registrationId: fixture.registration.id },
      data: { status: 'cancelled' },
    });

    await scan();

    const [{ update }] = sent().filter(
      (m) => m.to === fixture.registration.email,
    );
    expect(update.terms.map((t) => t.status)).toEqual(['confirmed']);
    expect(update.payment.balanceMinor).toBe(300_000);
  });

  it("holds nothing but the registration's own data", async () => {
    const fixture = await setup(['confirmed']);
    const other = await setup(['confirmed']);
    await decide(fixture);

    await scan();

    const mail = mailbox.sent.find((m) => m.to === fixture.registration.email);
    expect(mail?.html).not.toContain(other.registration.lastName);
    expect(mail?.html).not.toMatch(/determination|intervention|batch/i);
    const { update } = JSON.parse(mail?.html ?? '{}') as {
      update: Record<string, unknown>;
    };
    expect(Object.keys(update).sort()).toEqual(
      [
        'changes',
        'eventName',
        'hasMagicLink',
        'organizer',
        'payment',
        'proposedTerms',
        'reason',
        'terms',
      ].sort(),
    );
  });
});

describe('failures', () => {
  it('keeps the decision when the provider fails, and does not retry', async () => {
    const fixture = await setup(['confirmed']);
    const event = await decide(fixture);
    mailbox.failWith = 'provider down';

    await scan();
    mailbox.failWith = null;
    await scan();

    const [delivery] = await deliveries(event.id);
    expect(delivery.status).toBe('failed');
    expect(delivery.errorMessage).toContain('provider down');
    expect(mailbox.sent).not.toContainEqual(
      expect.objectContaining({ to: fixture.registration.email }),
    );
    expect(
      await prisma.registrationTerm.count({
        where: { registrationId: fixture.registration.id, status: 'confirmed' },
      }),
    ).toBe(1);
    expect(
      await prisma.registrationResultEvent.count({ where: { id: event.id } }),
    ).toBe(1);
  });

  it('records a result that cannot be built as a failed delivery', async () => {
    const fixture = await setup(['confirmed']);
    // A free registration has no account; a result that owes money anyway is a defect.
    await prisma.registrationTerm.updateMany({
      where: { registrationId: fixture.registration.id },
      data: { priceMinor: 0 },
    });
    await prisma.registration.update({
      where: { id: fixture.registration.id },
      data: {
        bankAccountNumber: null,
        bankCode: null,
        bankAccountPrefix: null,
        paymentReminderDays: null,
      },
    });
    const event = await decide(fixture);

    await scan();
    await scan();

    const rows = await deliveries(event.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('failed');
    expect(rows[0].errorMessage).toContain('no bank account');
    expect(mailbox.sent).toHaveLength(0);
  });
});
