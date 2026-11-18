import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma, Registration } from '@/generated/prisma/client';
import { resultPayload } from '@/modules/accommodation/domain/term-decision';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  hashToken,
  newToken,
  PARTICIPANT_SESSION_COOKIE,
  SESSION_TTL_MS,
} from '@/modules/participant-access/domain/participant-access';
import { ParticipantSessionGuard } from '@/modules/participant-access/guards/participant-session.guard';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { ParticipantNotificationsController } from '@/modules/participant-notifications/controllers/participant-notifications.controller';
import { ParticipantNotificationsRepository } from '@/modules/participant-notifications/repositories/participant-notifications.repository';
import { ParticipantNotificationsService } from '@/modules/participant-notifications/services/participant-notifications.service';
import { BankTransactionsRepository } from '@/modules/payments/repositories/bank-transactions.repository';
import { PlannedTerm } from '@/modules/registrations/domain/registration-change';
import { PaymentsRepository } from '@/modules/registrations/repositories/payments.repository';
import { QrPaymentsRepository } from '@/modules/registrations/repositories/qr-payments.repository';
import { Config } from '@/shared/config/config.service';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';

// S4-06 through the HTTP API against a real database: the notifications of
// the signed-in account's own registrations, read from the saved decisions,
// decided change requests and payments; read, read-all and dismiss. Payments
// are saved through the real repositories of every path, so a repeated
// submission or an unpaired bank transaction is checked as it happens.
// Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

// The access service imports the magic-link e-mail, whose renderer jest's VM
// cannot load; no e-mail is sent here.
jest.mock('@/core/email/render', () => ({
  renderEmail: (): Promise<string> => Promise.resolve(''),
}));

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [ParticipantNotificationsController],
    providers: [
      ParticipantNotificationsService,
      ParticipantNotificationsRepository,
      ParticipantAccessService,
      ParticipantAccessRepository,
      ParticipantSessionGuard,
      {
        provide: Config,
        useValue: { frontendUrl: 'http://app.test', nodeEnv: 'test' },
      },
      {
        provide: 'EmailService',
        useValue: { sendEmail: (): Promise<void> => Promise.resolve() },
      },
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
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
  cookie?: string,
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/participant/notifications${path}`, {
    method,
    headers: cookie ? { cookie } : {},
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const list = async (cookie: string): Promise<Call['body'][]> => {
  const response = await call('GET', '', cookie);
  expect(response.status).toBe(200);
  return response.body.items;
};

type Setup = CreatedEvent & { scope: EventScope };

/** An open event with two paid terms and a bank account. */
const setUp = async (): Promise<Setup> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [
      { startDate: '2027-07-01', endDate: '2027-07-07', label: '1. turnus' },
      { startDate: '2027-07-08', endDate: '2027-07-14', label: '2. turnus' },
    ],
  });
  return {
    ...created,
    scope: {
      organizationId: organization.id,
      ownerId: organization.ownerId,
      eventId: created.event.id,
    },
  };
};

/** A registration of the signed-in participant, with a session cookie. */
const signedInRegistration = async (
  setup: Setup,
): Promise<{ registration: Registration; cookie: string }> => {
  const registration = await createRegistration(prisma, {
    event: setup.event,
    terms: setup.terms.map((term) => ({ term, status: 'confirmed' })),
  });
  const token = newToken();
  await prisma.participantSession.create({
    data: {
      participantAccountId: registration.participantAccountId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { registration, cookie: `${PARTICIPANT_SESSION_COOKIE}=${token}` };
};

/** A saved organizer decision (S3-02) on the given terms of the registration. */
const decide = (
  setup: Setup,
  registration: Registration,
  moves: { termIndex: number; to: 'confirmed' | 'waitlisted' }[],
  createdAt = new Date(),
) =>
  prisma.registrationResultEvent.create({
    data: {
      eventId: setup.event.id,
      registrationId: registration.id,
      batchId: randomUUID(),
      createdAt,
      payload: resultPayload({
        decided: moves.map((move) => ({
          termId: setup.terms[move.termIndex].id,
          from: 'pending',
          to: move.to,
        })),
        terms: setup.terms.map((term, index) => ({
          termId: term.id,
          label: term.label,
          startDate: term.startDate.toISOString().slice(0, 10),
          endDate: term.endDate.toISOString().slice(0, 10),
          status:
            moves.find((move) => move.termIndex === index)?.to ?? 'pending',
          priceMinor: term.priceMinor,
        })),
        paidMinor: 0,
        variableSymbol: registration.variableSymbol,
        reminderAt: null,
      }) as unknown as Prisma.InputJsonValue,
    },
  });

/** A change request of the participant that releases the first term. */
const changeRequest = (
  setup: Setup,
  registration: Registration,
  status: 'pending' | 'applied' | 'approved' | 'rejected',
  decidedAt: Date | null = status === 'pending' ? null : new Date(),
) => {
  const first = setup.terms[0];
  const released: PlannedTerm = {
    termId: first.id,
    label: first.label,
    startDate: first.startDate.toISOString().slice(0, 10),
    endDate: first.endDate.toISOString().slice(0, 10),
    priceMinor: first.priceMinor,
    original: 'confirmed',
    proposed: 'cancelled',
  };
  const money = { dueMinor: 0, paidMinor: 0, balanceMinor: 0 };
  return prisma.registrationChange.create({
    data: {
      registrationId: registration.id,
      eventId: setup.event.id,
      status,
      proposal: {},
      summary: {
        values: [],
        needs: null,
        terms: [released],
        original: money,
        proposed: money,
      },
      decidedAt,
    },
  });
};

describe('access', () => {
  it('refuses without a valid session', async () => {
    const missing = await call('GET', '');
    const unknown = await call(
      'GET',
      '',
      `${PARTICIPANT_SESSION_COOKIE}=${newToken()}`,
    );
    expect([missing.status, unknown.status]).toEqual([401, 401]);
    expect(missing.body.code).toBe('participant_session_required');
  });

  it('gives an empty list when nothing was saved yet', async () => {
    const { cookie } = await signedInRegistration(await setUp());
    expect(await list(cookie)).toEqual([]);
  });
});

describe('organizer decisions', () => {
  it('shows one decision on two terms as one notification with both terms', async () => {
    const setup = await setUp();
    const { registration, cookie } = await signedInRegistration(setup);
    const decision = await decide(setup, registration, [
      { termIndex: 0, to: 'confirmed' },
      { termIndex: 1, to: 'waitlisted' },
    ]);

    expect(await list(cookie)).toEqual([
      {
        id: decision.id,
        kind: 'decision',
        registrationId: registration.id,
        eventName: setup.event.name,
        at: decision.createdAt.toISOString(),
        isRead: false,
        terms: [
          {
            label: '1. turnus',
            startDate: '2027-07-01',
            endDate: '2027-07-07',
            status: 'confirmed',
          },
          {
            label: '2. turnus',
            startDate: '2027-07-08',
            endDate: '2027-07-14',
            status: 'waitlisted',
          },
        ],
        amountMinor: null,
      },
    ]);
  });
});

describe('change requests', () => {
  it('shows approved and rejected requests, never a waiting or an own executed change', async () => {
    const setup = await setUp();
    const { registration, cookie } = await signedInRegistration(setup);
    await changeRequest(setup, registration, 'applied');
    const rejected = await changeRequest(
      setup,
      registration,
      'rejected',
      new Date('2026-11-01T10:00:00Z'),
    );
    const approved = await changeRequest(
      setup,
      registration,
      'approved',
      new Date('2026-11-02T10:00:00Z'),
    );
    await changeRequest(setup, registration, 'pending');

    const items = await list(cookie);

    expect(items.map((item) => [item.id, item.kind])).toEqual([
      [approved.id, 'changeApproved'],
      [rejected.id, 'changeRejected'],
    ]);
    expect(items[0].at).toBe('2026-11-02T10:00:00.000Z');
    expect(items.map((item) => item.terms[0].status)).toEqual([
      'cancelled',
      'confirmed',
    ]);
  });
});

describe('payments', () => {
  it('gives one notification per saved payment of every path, none for a repeat or an unpaired transaction', async () => {
    const setup = await setUp();
    const { registration, cookie } = await signedInRegistration(setup);
    const payments = new PaymentsRepository(prisma);
    const qr = new QrPaymentsRepository(prisma);
    const bank = new BankTransactionsRepository(prisma);

    // Recorded by the organizer (#91); the retry with the same key is refused.
    const manualKey = randomUUID();
    const manual = {
      submissionKey: manualKey,
      amountMinor: 10_000,
      receivedOn: '2026-11-01',
    };
    await payments.create(
      setup.scope,
      registration.id,
      manual,
      setup.scope.ownerId,
    );
    await expect(
      payments.create(
        setup.scope,
        registration.id,
        manual,
        setup.scope.ownerId,
      ),
    ).rejects.toThrow();

    // Paid through the QR link (#176); a repeat of the same key saves nothing.
    const qrKey = randomUUID();
    const paid = await qr.pay(registration.paymentToken, qrKey, 20_000);
    expect(paid.kind).toBe('paid');
    await qr.pay(registration.paymentToken, qrKey, 20_000);

    // Imported (#30): one paired, twice; the other stays unpaired.
    await bank.insertNew(setup.scope, [
      {
        bankTransactionId: `tx-${randomUUID().slice(0, 8)}`,
        bookedOn: '2026-11-03',
        amountMinor: 30_000,
        variableSymbol: registration.variableSymbol,
        counterpartyAccount: null,
        counterpartyName: null,
        message: null,
      },
      {
        bankTransactionId: `tx-${randomUUID().slice(0, 8)}`,
        bookedOn: '2026-11-03',
        amountMinor: 40_000,
        variableSymbol: null,
        counterpartyAccount: null,
        counterpartyName: null,
        message: null,
      },
    ]);
    const { transactions } = await bank.pairingInputs(setup.scope);
    const matched = transactions.find(
      (transaction) =>
        transaction.variableSymbol === registration.variableSymbol,
    )!;
    expect(
      await bank.pair(setup.scope, matched.id, registration.id, null),
    ).toBe('paired');
    expect(
      await bank.pair(setup.scope, matched.id, registration.id, null),
    ).toBe('already_paired');

    const items = await list(cookie);

    expect(items.map((item) => [item.kind, item.amountMinor])).toEqual([
      ['payment', 30_000],
      ['payment', 20_000],
      ['payment', 10_000],
    ]);
    expect(items.every((item) => item.registrationId === registration.id)).toBe(
      true,
    );
  });
});

describe('order and isolation', () => {
  it('orders every kind together, newest first', async () => {
    const setup = await setUp();
    const { registration, cookie } = await signedInRegistration(setup);
    const decision = await decide(
      setup,
      registration,
      [{ termIndex: 0, to: 'confirmed' }],
      new Date('2026-11-01T08:00:00Z'),
    );
    const payment = await createPayment(prisma, {
      registration,
      recordedById: setup.scope.ownerId,
      amountMinor: 5_000,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { createdAt: new Date('2026-11-02T08:00:00Z') },
    });
    const change = await changeRequest(
      setup,
      registration,
      'approved',
      new Date('2026-11-03T08:00:00Z'),
    );

    expect((await list(cookie)).map((item) => item.id)).toEqual([
      change.id,
      payment.id,
      decision.id,
    ]);
  });

  it("never shows, reads or dismisses another participant's notification", async () => {
    const setup = await setUp();
    const own = await signedInRegistration(setup);
    const other = await signedInRegistration(setup);
    const foreign = await createPayment(prisma, {
      registration: other.registration,
      recordedById: setup.scope.ownerId,
      amountMinor: 7_000,
    });

    expect(await list(own.cookie)).toEqual([]);
    for (const action of ['read', 'dismiss']) {
      const refused = await call(
        'POST',
        `/${foreign.id}/${action}`,
        own.cookie,
      );
      expect(refused.status).toBe(404);
      expect(refused.body.code).toBe('notification_not_found');
    }
    expect(
      (await call('POST', `/${randomUUID()}/read`, own.cookie)).status,
    ).toBe(404);
    // The other participant still sees theirs, unread.
    expect(await list(other.cookie)).toEqual([
      expect.objectContaining({ id: foreign.id, isRead: false }),
    ]);
  });
});

describe('read and dismiss', () => {
  const twoPayments = async () => {
    const setup = await setUp();
    const own = await signedInRegistration(setup);
    const [first, second] = [
      await createPayment(prisma, {
        registration: own.registration,
        recordedById: setup.scope.ownerId,
        amountMinor: 1_000,
      }),
      await createPayment(prisma, {
        registration: own.registration,
        recordedById: setup.scope.ownerId,
        amountMinor: 2_000,
      }),
    ];
    return { ...own, first, second };
  };

  it('keeps a notification read after it was opened, also when opened again', async () => {
    const { cookie, first, second } = await twoPayments();

    expect((await call('POST', `/${first.id}/read`, cookie)).status).toBe(204);
    expect((await call('POST', `/${first.id}/read`, cookie)).status).toBe(204);

    const items = await list(cookie);
    expect(items.find((item) => item.id === first.id).isRead).toBe(true);
    expect(items.find((item) => item.id === second.id).isRead).toBe(false);
  });

  it('marks every shown notification read at once', async () => {
    const { cookie } = await twoPayments();

    expect((await call('POST', '/read', cookie)).status).toBe(204);

    expect((await list(cookie)).map((item) => item.isRead)).toEqual([
      true,
      true,
    ]);
  });

  it('hides a dismissed notification for good and counts it as read', async () => {
    const { registration, cookie, first, second } = await twoPayments();

    expect((await call('POST', `/${first.id}/dismiss`, cookie)).status).toBe(
      204,
    );

    expect((await list(cookie)).map((item) => item.id)).toEqual([second.id]);
    const state = await prisma.participantNotificationState.findUniqueOrThrow({
      where: {
        participantAccountId_sourceId: {
          participantAccountId: registration.participantAccountId,
          sourceId: first.id,
        },
      },
    });
    expect(state.readAt).not.toBeNull();
    // The payment itself stays.
    expect(await prisma.payment.count({ where: { id: first.id } })).toBe(1);
  });
});
