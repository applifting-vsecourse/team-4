import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ParticipationStatus } from '@/generated/prisma/client';
import { ParticipantAccessController } from '@/modules/participant-access/controllers/participant-access.controller';
import { ParticipantSessionGuard } from '@/modules/participant-access/guards/participant-session.guard';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { ParticipantRegistrationsController } from '@/modules/registrations/controllers/participant-registrations.controller';
import { ParticipantRegistrationsRepository } from '@/modules/registrations/repositories/participant-registrations.repository';
import { ParticipantRegistrationsService } from '@/modules/registrations/services/participant-registrations.service';
import { Config } from '@/shared/config/config.service';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';

// S2-14 through the HTTP API against a real database: the participant's own
// list and detail, mixed and zero-obligation payment summaries, payment
// history, and that nothing of another participant is reachable. Sessions are
// real (S2-13). Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: { url: string }): Promise<string> =>
    Promise.resolve(`<a href="${props.url}">link</a>`),
}));

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;
let access: ParticipantAccessService;
let html: string[];

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [
      ParticipantAccessController,
      ParticipantRegistrationsController,
    ],
    providers: [
      ParticipantAccessService,
      ParticipantAccessRepository,
      ParticipantSessionGuard,
      ParticipantRegistrationsService,
      ParticipantRegistrationsRepository,
      {
        provide: Config,
        useValue: { frontendUrl: 'http://app.test', nodeEnv: 'test' },
      },
      {
        provide: 'EmailService',
        useValue: {
          sendEmail: (_to: string, _subject: string, body: string) => {
            html.push(body);
            return Promise.resolve();
          },
        },
      },
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
  access = app.get(ParticipantAccessService);
});

beforeEach(() => {
  html = [];
});

afterAll(() => app.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any; cookie: string | null };

const call = async (
  method: 'GET' | 'POST',
  path: string,
  options: { body?: unknown; cookie?: string } = {},
): Promise<Call> => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    cookie: response.headers.get('set-cookie'),
  };
};

const signIn = async (email: string): Promise<string> => {
  await call('POST', '/participant/magic-links', { body: { email } });
  await access.settleDeliveries();
  const token = /verify\?token=([A-Za-z0-9_-]+)/.exec(
    html[html.length - 1],
  )?.[1];
  const opened = await call('POST', '/participant/session', {
    body: { token },
  });
  expect(opened.status).toBe(204);
  return (opened.cookie as string).split(';')[0];
};

const T1 = {
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  label: 'T1',
  priceMinor: 790_000,
};
const T2 = {
  startDate: '2027-07-15',
  endDate: '2027-07-21',
  label: 'T2',
  priceMinor: 390_000,
};

const register = async (
  email: string,
  statuses: ParticipationStatus[],
  options: { reminder?: boolean } = {},
) => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [T1, T2],
  });
  const registration = await createRegistration(prisma, {
    event: created.event,
    terms: statuses.map((status, index) => ({
      term: created.terms[index],
      status,
    })),
    email,
  });
  if (options.reminder ?? true) {
    await prisma.registration.update({
      where: { id: registration.id },
      data: { paymentReminderAt: new Date('2027-06-28T08:00:00Z') },
    });
  }
  return { registration, ...created, organization };
};

const newEmail = (): string => `p-${randomUUID().slice(0, 8)}@example.test`;

describe('access', () => {
  it('refuses the list and the detail without a session', async () => {
    const list = await call('GET', '/participant/registrations');
    expect(list.status).toBe(401);
    expect(list.body.code).toBe('participant_session_required');
    const detail = await call(
      'GET',
      `/participant/registrations/${randomUUID()}`,
    );
    expect(detail.status).toBe(401);
  });

  it('lists only the signed-in participant’s own registrations', async () => {
    const mine = newEmail();
    const a = await register(mine, ['confirmed']);
    const b = await register(mine, ['waitlisted']);
    await register(newEmail(), ['confirmed']);

    const cookie = await signIn(mine);
    const list = await call('GET', '/participant/registrations', { cookie });

    expect(list.status).toBe(200);
    expect(
      list.body.registrations.map((r: { id: string }) => r.id).sort(),
    ).toEqual([a.registration.id, b.registration.id].sort());
  });

  it('answers 404 for another participant’s registration, same as a missing one', async () => {
    const other = await register(newEmail(), ['confirmed']);
    const mine = newEmail();
    await register(mine, ['confirmed']);
    const own = await signIn(mine);
    const foreign = await call(
      'GET',
      `/participant/registrations/${other.registration.id}`,
      { cookie: own },
    );
    const missing = await call(
      'GET',
      `/participant/registrations/${randomUUID()}`,
      { cookie: own },
    );
    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual(missing.body);
    expect(JSON.stringify(foreign.body)).not.toContain(other.event.name);
  });
});

describe('summary', () => {
  it('splits a mixed registration and shows what is still owed', async () => {
    const email = newEmail();
    const { registration, event } = await register(email, [
      'confirmed',
      'waitlisted',
    ]);
    const owner = await createOrganizer(prisma);
    await createPayment(prisma, {
      registration,
      recordedById: owner.id,
      amountMinor: 190_000,
      receivedOn: '2026-10-12',
    });

    const cookie = await signIn(email);
    const { body } = await call(
      'GET',
      `/participant/registrations/${registration.id}`,
      { cookie },
    );

    expect(body.event).toEqual({ name: event.name, location: event.location });
    expect(body.terms.map((t: { status: string }) => t.status)).toEqual([
      'confirmed',
      'waitlisted',
    ]);
    expect(body).toMatchObject({
      selectedPriceMinor: 1_180_000,
      amountDueMinor: 790_000,
      paidMinor: 190_000,
      balanceMinor: 600_000,
      paymentState: 'partial',
      paymentInstructions: {
        amountMinor: 600_000,
        variableSymbol: registration.variableSymbol,
        reminderAt: '2027-06-28T08:00:00.000Z',
      },
      payments: [{ receivedOn: '2026-10-12', amountMinor: 190_000 }],
    });
    // Paying never changes the participation status.
    expect(body.terms[0].status).toBe('confirmed');
  });

  it('has no instructions with only waitlisted terms', async () => {
    const email = newEmail();
    const { registration } = await register(email, ['waitlisted'], {
      reminder: false,
    });
    const cookie = await signIn(email);
    const { body } = await call(
      'GET',
      `/participant/registrations/${registration.id}`,
      { cookie },
    );
    expect(body).toMatchObject({
      amountDueMinor: 0,
      balanceMinor: 0,
      paymentInstructions: null,
      payments: [],
    });
  });

  it('stops asking to pay once the debt is settled', async () => {
    const email = newEmail();
    const { registration } = await register(email, ['confirmed']);
    const owner = await createOrganizer(prisma);
    await createPayment(prisma, {
      registration,
      recordedById: owner.id,
      amountMinor: 790_000,
    });
    const cookie = await signIn(email);
    const { body } = await call(
      'GET',
      `/participant/registrations/${registration.id}`,
      { cookie },
    );
    expect(body.balanceMinor).toBe(0);
    expect(body.paymentInstructions).toBeNull();
  });
});
