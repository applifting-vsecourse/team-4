import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { ParticipantRegistrationsController } from '@/modules/registrations/controllers/participant-registrations.controller';
import { PaymentsController } from '@/modules/registrations/controllers/payments.controller';
import { RegistrationChangesController } from '@/modules/registrations/controllers/registration-changes.controller';
import { ParticipantUpdatePayload } from '@/modules/registrations/domain/participant-update';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { ParticipantRegistrationsRepository } from '@/modules/registrations/repositories/participant-registrations.repository';
import { PaymentsRepository } from '@/modules/registrations/repositories/payments.repository';
import { RegistrationChangesRepository } from '@/modules/registrations/repositories/registration-changes.repository';
import { ParticipantRegistrationsService } from '@/modules/registrations/services/participant-registrations.service';
import { ParticipantUpdateService } from '@/modules/registrations/services/participant-update.service';
import { PaymentsService } from '@/modules/registrations/services/payments.service';
import { RegistrationChangesService } from '@/modules/registrations/services/registration-changes.service';
import { Mailbox, updateProviders } from '@/testing/confirmation-mail';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createRegistration,
} from '@/testing/factories';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// react-email's renderer cannot load under jest (see `render-markup.ts`), so
// the props are rendered as JSON; the template has its own spec.
jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: object): Promise<string> =>
    Promise.resolve(JSON.stringify(props)),
}));

// F45-1 against a real database: which saved events queue a participant
// e-mail, that one event gives one message, what the message holds, and that a
// failed send never undoes the event. Both guards are replaced:
// `x-test-account` names the participant and `x-test-user` the organizer.
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
let updates: ParticipantUpdateService;
const mailbox = new Mailbox();

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [
      ParticipantRegistrationsController,
      RegistrationChangesController,
      PaymentsController,
    ],
    providers: [
      ParticipantRegistrationsService,
      ParticipantRegistrationsRepository,
      RegistrationChangesService,
      RegistrationChangesRepository,
      PaymentsService,
      PaymentsRepository,
      EventRegistrationsRepository,
      ...updateProviders(mailbox),
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
  updates = app.get(ParticipantUpdateService);
});

beforeEach(() => mailbox.reset());

afterAll(() => app.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

const call = async (
  path: string,
  who: { account?: string; user?: string },
  body: unknown = {},
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(who.account ? { 'x-test-account': who.account } : {}),
      ...(who.user ? { 'x-test-user': who.user } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const inDays = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const term = (label: string, days: number, priceMinor = 240_000) => ({
  label,
  startDate: inDays(days),
  endDate: inDays(days + 2),
  priceMinor,
});

type Fixture = CreatedEvent & { ownerId: string; organizationId: string };

/** Terms: [0] +5 days, [1] +60; with approval days 14 a change of [0] needs approval. */
const setup = async (approvalDays: number | null): Promise<Fixture> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [term('Turnus 1', 5), term('Turnus 2', 60)],
    rooms: [{ baseBeds: 5, termIndexes: [0, 1] }],
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

const register = (
  fixture: Fixture,
  termIndexes: number[],
  email?: string,
): Promise<Registration> =>
  createRegistration(prisma, {
    event: fixture.event,
    email,
    terms: termIndexes.map((index) => ({
      term: fixture.terms[index],
      status: 'confirmed' as const,
    })),
  });

const own = (registration: Registration) => ({
  account: registration.participantAccountId,
});
const base = (registration: Registration): string =>
  `participant/registrations/${registration.id}`;
const managed = (fixture: Fixture, registration: Registration): string =>
  `organizations/${fixture.organizationId}/events/${fixture.event.id}/registrations/${registration.id}`;

/** Reviews and submits the way the form does. */
const submit = async (
  registration: Registration,
  proposal: Record<string, unknown>,
): Promise<Call> => {
  const full = { moves: [], cancelledTermIds: [], ...proposal };
  const preview = await call(
    `${base(registration)}/changes/preview`,
    own(registration),
    full,
  );
  expect(preview.status).toBe(200);
  const result = await call(
    `${base(registration)}/changes`,
    own(registration),
    {
      ...full,
      expectedVersion: preview.body.version,
      expectsApproval: preview.body.requiresApproval,
    },
  );
  await updates.settle();
  return result;
};

const sent = (): { to: string; subject: string; props: any }[] =>
  mailbox.sent.map((mail) => ({
    to: mail.to,
    subject: mail.subject,
    props: JSON.parse(mail.html) as {
      update: ParticipantUpdatePayload;
      url: string;
      payUrl: string;
    },
  }));

const deliveries = (registration: Registration) =>
  prisma.emailDelivery.findMany({
    where: { registrationId: registration.id, type: 'participant_update' },
    orderBy: { createdAt: 'asc' },
  });

describe('change requests', () => {
  it('confirms a waiting request, then sends one decision for the approval', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0, 1]);

    const requested = await submit(registration, { phone: '+420731987654' });
    expect(requested.body.outcome).toBe('requested');

    expect(sent()).toHaveLength(1);
    const [received] = sent();
    expect(received.to).toBe(registration.email);
    expect(received.props.update.reason).toBe('requestReceived');
    expect(received.props.update.terms.map((t) => t.status)).toEqual([
      'confirmed',
      'confirmed',
    ]);
    // A change of the data alone touches no term, so there is no second list.
    expect(received.props.update.proposedTerms).toBeNull();
    // And what exactly it would change.
    expect(received.props.update.changes).toEqual([
      {
        label: 'Telefon',
        original: '+420600000000',
        proposed: '+420731987654',
      },
    ]);
    expect(mailbox.images[0].map((image) => image.cid)).toEqual(['akcio-logo']);

    const path = `${managed(fixture, registration)}/changes/${requested.body.change.id}`;
    await call(`${path}/approve`, { user: fixture.ownerId });
    await updates.settle();
    expect(sent().map((m) => m.props.update.reason)).toEqual([
      'requestReceived',
      'requestApproved',
    ]);

    // Approving again changes nothing and sends nothing.
    await call(`${path}/approve`, { user: fixture.ownerId });
    await updates.settle();
    expect(sent()).toHaveLength(2);
  });

  it('tells the participant about a rejection and what still holds', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0]);
    const requested = await submit(registration, { phone: '+420731987654' });

    await call(
      `${managed(fixture, registration)}/changes/${requested.body.change.id}/reject`,
      { user: fixture.ownerId },
    );
    await updates.settle();

    expect(sent().map((m) => m.props.update.reason)).toEqual([
      'requestReceived',
      'requestRejected',
    ]);
  });

  it('sends nothing for a refused or repeated submission', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture, [0]);

    const stale = await call(
      `${base(registration)}/changes`,
      own(registration),
      {
        moves: [],
        cancelledTermIds: [],
        phone: '+420731987654',
        expectedVersion: 99,
        expectsApproval: true,
      },
    );
    await updates.settle();

    expect(stale.status).toBe(409);
    expect(mailbox.sent).toHaveLength(0);
    expect(await deliveries(registration)).toHaveLength(0);
  });
});

describe('direct changes by the participant', () => {
  it('sends nothing for a change that moves no money', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);

    const result = await submit(registration, { phone: '+420731987654' });

    expect(result.body.outcome).toBe('applied');
    expect(mailbox.sent).toHaveLength(0);
  });

  it('sends the new amount and the payment details when the debt changed', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [0, 1]);

    const result = await submit(registration, {
      cancelledTermIds: [fixture.terms[0].id],
    });

    expect(result.body.outcome).toBe('applied');
    expect(sent()).toHaveLength(1);
    const { update, url, payUrl } = sent()[0].props;
    expect(update.reason).toBe('balanceChanged');
    expect(update.payment.balanceMinor).toBe(240_000);
    expect(update.payment.bank.variableSymbol).toBe(
      registration.variableSymbol,
    );
    expect(payUrl).toBe(`http://app.test/platba/${registration.paymentToken}`);
    expect(url).toContain('/my-registrations/verify?token=');
  });
});

describe('payments', () => {
  it('confirms the payment with the total received and what is left', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);

    const result = await call(
      `${managed(fixture, registration)}/payments`,
      { user: fixture.ownerId },
      payment(100_000),
    );
    await updates.settle();

    expect(result.status).toBe(201);
    expect(sent()).toHaveLength(1);
    const { update } = sent()[0].props;
    expect(update.reason).toBe('paymentRecorded');
    expect(update.payment.recorded).toEqual({
      amountMinor: 100_000,
      receivedOn: '2026-10-01',
    });
    expect(update.payment.receivedMinor).toBe(100_000);
    expect(update.payment.balanceMinor).toBe(140_000);
    // A debt carries the QR code as an attached image, next to the logo.
    expect(mailbox.images[0].map((image) => image.cid)).toEqual([
      'akcio-logo',
      'akcio-payment-qr',
    ]);
  });

  it('sends one message for a repeated request', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    const body = payment(240_000);

    await call(
      `${managed(fixture, registration)}/payments`,
      { user: fixture.ownerId },
      body,
    );
    await call(
      `${managed(fixture, registration)}/payments`,
      { user: fixture.ownerId },
      body,
    );
    await updates.settle();

    expect(sent()).toHaveLength(1);
    expect(sent()[0].props.update.payment.balanceMinor).toBe(0);
    // Nothing is owed any more, so there is no code to pay with.
    expect(mailbox.images[0].map((image) => image.cid)).toEqual(['akcio-logo']);
    expect(await deliveries(registration)).toHaveLength(1);
  });

  it('keeps the payment when the provider fails and stores no token', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    mailbox.failWith = 'provider down';
    mailbox.echoBodyInError = true;

    const result = await call(
      `${managed(fixture, registration)}/payments`,
      { user: fixture.ownerId },
      payment(50_000),
    );
    await updates.settle();

    expect(result.status).toBe(201);
    expect(
      await prisma.payment.count({
        where: { registrationId: registration.id },
      }),
    ).toBe(1);
    const [delivery] = await deliveries(registration);
    expect(delivery.status).toBe('failed');
    expect(delivery.errorMessage).toContain('provider down');
    expect(delivery.errorMessage).not.toContain(registration.paymentToken);
    expect(delivery.errorMessage).not.toContain('token=');
  });
});

describe('recipient and access', () => {
  it('sends to the contact e-mail without a sign-in link when it is not the account e-mail', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    await prisma.registration.update({
      where: { id: registration.id },
      data: { email: 'rodice@example.test' },
    });

    await call(
      `${managed(fixture, registration)}/payments`,
      { user: fixture.ownerId },
      payment(10_000),
    );
    await updates.settle();

    const [mail] = sent();
    expect(mail.to).toBe('rodice@example.test');
    expect(mail.props.update.hasMagicLink).toBe(false);
    expect(mail.props.url).toBe('http://app.test/my-registrations');
    expect(
      await prisma.participantMagicLink.count({
        where: { participantAccountId: registration.participantAccountId },
      }),
    ).toBe(0);
  });

  it('holds nothing of the organizer-only history', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture, [1]);
    await call(
      `${managed(fixture, registration)}/payments`,
      { user: fixture.ownerId },
      payment(10_000),
    );
    await updates.settle();

    const keys = Object.keys(sent()[0].props.update).sort();
    expect(keys).toEqual(
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

const payment = (amountMinor: number, submissionKey = randomUUID()) => ({
  submissionKey,
  amountMinor,
  receivedOn: '2026-10-01',
});
