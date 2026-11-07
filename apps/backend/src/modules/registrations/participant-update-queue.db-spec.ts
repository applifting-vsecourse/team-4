import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { ParticipantUpdatePayload } from '@/modules/registrations/domain/participant-update';
import { queueParticipantUpdate } from '@/modules/registrations/repositories/participant-update-queue';
import { ParticipantUpdatesRepository } from '@/modules/registrations/repositories/participant-updates.repository';
import { ParticipantUpdateService } from '@/modules/registrations/services/participant-update.service';
import { Mailbox, updateProviders } from '@/testing/confirmation-mail';
import {
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

// F45-1: the queue and the sender of participant e-mails, without any
// trigger: one event gives one message, a message that cannot be built never
// undoes the event, a delivery is sent once, and no secret is kept. Needs a
// migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

let app: INestApplication;
let prisma: PrismaService;
let service: ParticipantUpdateService;
let repository: ParticipantUpdatesRepository;
const mailbox = new Mailbox();

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    providers: [...updateProviders(mailbox)],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = app.get(PrismaService);
  service = app.get(ParticipantUpdateService);
  repository = app.get(ParticipantUpdatesRepository);
});

beforeEach(() => mailbox.reset());

afterAll(() => app.close());

const registrationOwing = async (
  priceMinor = 300_000,
): Promise<Registration> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [
      {
        startDate: '2027-07-01',
        endDate: '2027-07-07',
        label: 'T1',
        priceMinor,
      },
    ],
  });
  return createRegistration(prisma, {
    event: created.event,
    terms: [{ term: created.terms[0], status: 'confirmed' }],
  });
};

const queue = (registration: Registration, dedupKey = randomUUID()) =>
  prisma.$transaction((tx) =>
    queueParticipantUpdate(tx, {
      registrationId: registration.id,
      reason: 'organizerChange',
      dedupKey,
    }),
  );

const send = async (registration: Registration): Promise<void> => {
  service.dispatch(registration.id);
  await service.settle();
};

const mails = (): { to: string; update: ParticipantUpdatePayload }[] =>
  mailbox.sent.map((mail) => ({
    to: mail.to,
    update: (JSON.parse(mail.html) as { update: ParticipantUpdatePayload })
      .update,
  }));

const deliveries = (registration: Registration) =>
  prisma.emailDelivery.findMany({
    where: { registrationId: registration.id, type: 'participant_update' },
  });

describe('queueing', () => {
  it('queues one message per event and takes a snapshot of the registration', async () => {
    const registration = await registrationOwing();
    const key = randomUUID();

    expect(await queue(registration, key)).toBe(true);
    expect(await queue(registration, key)).toBe(false);

    const rows = await deliveries(registration);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'pending',
      recipientEmail: registration.email,
      dedupKey: key,
    });
    const payload = rows[0].payload as unknown as ParticipantUpdatePayload;
    expect(payload.payment.balanceMinor).toBe(300_000);
    expect(payload.hasMagicLink).toBe(true);
    // The token of the payment page is read when sending, never kept here.
    expect(JSON.stringify(payload)).not.toContain(registration.paymentToken);
  });

  it('keeps the event when the message cannot be built', async () => {
    const registration = await registrationOwing();
    // A legacy registration that owes money but has no account to pay to.
    await prisma.registration.update({
      where: { id: registration.id },
      data: {
        bankAccountNumber: null,
        bankCode: null,
        bankAccountPrefix: null,
        paymentReminderDays: null,
      },
    });

    const queued = await prisma.$transaction(async (tx) => {
      // The event itself, saved in the same transaction as the message.
      await tx.registration.update({
        where: { id: registration.id },
        data: { phone: '+420731987654' },
      });
      return queueParticipantUpdate(tx, {
        registrationId: registration.id,
        reason: 'organizerChange',
        dedupKey: randomUUID(),
      });
    });

    expect(queued).toBe(false);
    expect(
      (
        await prisma.registration.findUniqueOrThrow({
          where: { id: registration.id },
        })
      ).phone,
    ).toBe('+420731987654');
    const [delivery] = await deliveries(registration);
    expect(delivery.status).toBe('failed');
    expect(delivery.errorMessage).toContain('no bank account');
  });
});

describe('sending', () => {
  it('sends a queued message once, with the logo and the payment QR for a debt', async () => {
    const registration = await registrationOwing();
    await queue(registration);

    await send(registration);
    await send(registration);

    expect(mails()).toHaveLength(1);
    expect(mails()[0].to).toBe(registration.email);
    expect(mailbox.images[0].map((image) => image.cid)).toEqual([
      'akcio-logo',
      'akcio-payment-qr',
    ]);
    expect((await deliveries(registration))[0].status).toBe('accepted');
  });

  it('attaches no QR code when nothing is owed', async () => {
    const registration = await registrationOwing(0);
    await queue(registration);

    await send(registration);

    expect(mailbox.images[0].map((image) => image.cid)).toEqual(['akcio-logo']);
  });

  it('lets only one of concurrent claims take a delivery', async () => {
    const registration = await registrationOwing();
    await queue(registration);
    const [id] = await repository.findPendingIds(registration.id);

    const claims = await Promise.all([
      repository.claim(id),
      repository.claim(id),
      repository.claim(id),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
  });

  it('opens no sign-in link for a contact e-mail that is not the account e-mail', async () => {
    const registration = await registrationOwing();
    await prisma.registration.update({
      where: { id: registration.id },
      data: { email: 'rodice@example.test' },
    });
    await queue(registration);

    await send(registration);

    const [mail] = mailbox.sent;
    expect(mail.to).toBe('rodice@example.test');
    const props = JSON.parse(mail.html) as { url: string };
    expect(props.url).toBe('http://app.test/my-registrations');
    expect(
      await prisma.participantMagicLink.count({
        where: { participantAccountId: registration.participantAccountId },
      }),
    ).toBe(0);
  });

  it('keeps no link or token of a failed send', async () => {
    const registration = await registrationOwing();
    await queue(registration);
    mailbox.failWith = 'provider down';
    mailbox.echoBodyInError = true;

    await send(registration);

    const [delivery] = await deliveries(registration);
    expect(delivery.status).toBe('failed');
    expect(delivery.errorMessage).toContain('provider down');
    expect(delivery.errorMessage).not.toContain('token=');
    expect(delivery.errorMessage).not.toContain(registration.paymentToken);
  });
});
