import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  hashToken,
  newToken,
  PARTICIPANT_SESSION_COOKIE,
  SESSION_TTL_MS,
} from '@/modules/participant-access/domain/participant-access';
import { ParticipantSessionGuard } from '@/modules/participant-access/guards/participant-session.guard';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { ParticipantProfileController } from '@/modules/participant-profile/controllers/participant-profile.controller';
import { ParticipantProfileRepository } from '@/modules/participant-profile/repositories/participant-profile.repository';
import { ParticipantProfileService } from '@/modules/participant-profile/services/participant-profile.service';
import { Config } from '@/shared/config/config.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';

// S4-08 through the HTTP API against a real database: the profile of the
// verified account only, every field optional, an E.164 phone, and the
// sign-in e-mail untouched. Needs a migrated Postgres in DATABASE_URL:
// `pnpm backend test:db`.

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
    controllers: [ParticipantProfileController],
    providers: [
      ParticipantProfileService,
      ParticipantProfileRepository,
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
  method: 'GET' | 'PUT',
  options: { body?: unknown; cookie?: string } = {},
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/participant/profile`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

/** An account with a valid session, as a used magic link leaves it. */
const signedIn = async (): Promise<{
  accountId: string;
  email: string;
  cookie: string;
}> => {
  const email = `p-${randomUUID().slice(0, 8)}@example.test`;
  const account = await prisma.participantAccount.create({ data: { email } });
  const token = newToken();
  await prisma.participantSession.create({
    data: {
      participantAccountId: account.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return {
    accountId: account.id,
    email,
    cookie: `${PARTICIPANT_SESSION_COOKIE}=${token}`,
  };
};

describe('reading the profile', () => {
  it('gives an empty profile with the sign-in e-mail of a new account', async () => {
    const { email, cookie } = await signedIn();

    const read = await call('GET', { cookie });

    expect(read.status).toBe(200);
    expect(read.body).toEqual({
      email,
      firstName: null,
      lastName: null,
      phone: null,
    });
  });

  it('refuses without a valid session', async () => {
    const missing = await call('GET');
    const unknown = await call('GET', {
      cookie: `${PARTICIPANT_SESSION_COOKIE}=${newToken()}`,
    });

    expect([missing.status, unknown.status]).toEqual([401, 401]);
    expect(missing.body.code).toBe('participant_session_required');
  });
});

describe('saving the profile', () => {
  it('stores trimmed names and an E.164 phone, and reads them back', async () => {
    const { email, cookie } = await signedIn();

    const saved = await call('PUT', {
      cookie,
      body: {
        firstName: '  Anna ',
        lastName: 'Nováková',
        phone: '+420 604 123 456',
      },
    });
    const read = await call('GET', { cookie });

    expect(saved.status).toBe(200);
    const profile = {
      email,
      firstName: 'Anna',
      lastName: 'Nováková',
      phone: '+420604123456',
    };
    expect(saved.body).toEqual(profile);
    expect(read.body).toEqual(profile);
  });

  it('accepts a partial or empty profile and clears what is left out or blank', async () => {
    const { cookie } = await signedIn();
    await call('PUT', {
      cookie,
      body: { firstName: 'Anna', lastName: 'Nováková', phone: '+420604123456' },
    });

    const partial = await call('PUT', {
      cookie,
      body: { firstName: 'Anna', lastName: '   ', phone: null },
    });
    const empty = await call('PUT', { cookie, body: {} });

    expect(partial.status).toBe(200);
    expect(partial.body).toMatchObject({
      firstName: 'Anna',
      lastName: null,
      phone: null,
    });
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({
      firstName: null,
      lastName: null,
      phone: null,
    });
  });

  it('refuses an invalid phone or a too long name and keeps what was stored', async () => {
    const { cookie } = await signedIn();
    await call('PUT', { cookie, body: { firstName: 'Anna' } });

    const phone = await call('PUT', {
      cookie,
      body: { firstName: 'Jiná', phone: '777 123' },
    });
    const name = await call('PUT', {
      cookie,
      body: { firstName: 'x'.repeat(101) },
    });

    expect([phone.status, name.status]).toEqual([400, 400]);
    expect((await call('GET', { cookie })).body.firstName).toBe('Anna');
  });

  it('cannot change the sign-in e-mail', async () => {
    const { email, cookie } = await signedIn();

    const saved = await call('PUT', {
      cookie,
      body: { email: 'other@example.test' },
    });

    expect(saved.status).toBe(400);
    expect((await call('GET', { cookie })).body.email).toBe(email);
  });

  it('is guarded by the database: no empty name, only an E.164 phone', async () => {
    const { accountId } = await signedIn();
    const write = (data: object): Promise<unknown> =>
      prisma.participantAccount.update({ where: { id: accountId }, data });

    await expect(write({ firstName: ' ' })).rejects.toThrow();
    await expect(write({ lastName: '' })).rejects.toThrow();
    await expect(write({ phone: '777123456' })).rejects.toThrow();
    await expect(write({ phone: '+420604123456' })).resolves.toBeDefined();
  });

  it('changes only the profile of the signed-in account', async () => {
    const own = await signedIn();
    const other = await signedIn();
    await call('PUT', { cookie: other.cookie, body: { firstName: 'Petr' } });

    await call('PUT', { cookie: own.cookie, body: { firstName: 'Anna' } });

    const stored = await prisma.participantAccount.findUniqueOrThrow({
      where: { id: other.accountId },
    });
    expect(stored.firstName).toBe('Petr');
    expect((await call('GET', { cookie: own.cookie })).body.firstName).toBe(
      'Anna',
    );
  });
});
