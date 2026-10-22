import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ParticipantAccessController } from '@/modules/participant-access/controllers/participant-access.controller';
import {
  hashToken,
  LINK_REQUESTED_MESSAGE,
  PARTICIPANT_SESSION_COOKIE,
} from '@/modules/participant-access/domain/participant-access';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { Config } from '@/shared/config/config.service';
import {
  createEvent,
  createOrganization,
  createRegistration,
} from '@/testing/factories';
import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';

// S2-13 through the HTTP API against a real database: the same answer for
// every e-mail, the 3-per-15-minutes limit, single use and expiry of a link,
// the 7-day session, logout, and the guard a participant-only endpoint uses.
// Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

// react-email loads its renderer with a dynamic import that jest's VM refuses,
// so the template is stood in for here; the real message is checked by sending.
jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: { url: string }): Promise<string> =>
    Promise.resolve(`<a href="${props.url}">link</a>`),
}));

// Stands in for the S2-14 list: reachable only through the shared guard.
@Controller('participant-probe')
class ProbeController {
  @Get()
  @UseGuards(ParticipantSessionGuard)
  read(@CurrentParticipant() participant: { email: string }): {
    email: string;
  } {
    return { email: participant.email };
  }
}

type Mail = { to: string; subject: string; html: string };

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;
let access: ParticipantAccessService;
let sent: Mail[];
let failSending = false;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [ParticipantAccessController, ProbeController],
    providers: [
      ParticipantAccessService,
      ParticipantAccessRepository,
      ParticipantSessionGuard,
      {
        provide: Config,
        useValue: { frontendUrl: 'http://app.test', nodeEnv: 'test' },
      },
      {
        provide: 'EmailService',
        useValue: {
          sendEmail: (
            to: string,
            subject: string,
            html: string,
          ): Promise<void> => {
            if (failSending) {
              return Promise.reject(new Error(`provider said no to ${to}`));
            }
            sent.push({ to, subject, html });
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
  sent = [];
  failSending = false;
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

const requestLink = async (email: string): Promise<Call> => {
  const result = await call('POST', '/participant/magic-links', {
    body: { email },
  });
  await access.settleDeliveries();
  return result;
};

const tokenOf = (mail: Mail): string => {
  const match = /my-registrations\/verify\?token=([A-Za-z0-9_-]+)/.exec(
    mail.html,
  );
  if (!match) throw new Error('no link in the e-mail');
  return match[1];
};

/** A participant with one saved registration, as S2-08 leaves them. */
const participant = async (): Promise<{ email: string; accountId: string }> => {
  const organization = await createOrganization(prisma);
  const { event, terms } = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [{ startDate: '2027-07-01', endDate: '2027-07-07' }],
  });
  const email = `p-${randomUUID().slice(0, 8)}@example.test`;
  const registration = await createRegistration(prisma, {
    event,
    terms: [{ term: terms[0], status: 'confirmed' }],
    email,
  });
  return { email, accountId: registration.participantAccountId };
};

const signIn = async (email: string): Promise<string> => {
  await requestLink(email);
  const opened = await call('POST', '/participant/session', {
    body: { token: tokenOf(sent[sent.length - 1]) },
  });
  expect(opened.status).toBe(204);
  return (opened.cookie as string).split(';')[0];
};

describe('requesting a link', () => {
  it('sends a link through the mailer to a known e-mail', async () => {
    const { email, accountId } = await participant();
    const result = await requestLink(email);

    expect(result.status).toBe(200);
    expect(result.body.message).toBe(LINK_REQUESTED_MESSAGE);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(email);
    expect(sent[0].html).toContain('http://app.test/my-registrations/verify');

    const links = await prisma.participantMagicLink.findMany({
      where: { participantAccountId: accountId },
    });
    expect(links).toHaveLength(1);
    // only the hash is stored, never the token
    expect(links[0].tokenHash).toBe(hashToken(tokenOf(sent[0])));
    expect(JSON.stringify(links[0])).not.toContain(tokenOf(sent[0]));
    expect(links[0].expiresAt.getTime() - links[0].createdAt.getTime()).toBe(
      15 * 60 * 1000,
    );

    const delivery = await prisma.emailDelivery.findFirstOrThrow({
      where: {
        participantAccountId: accountId,
        type: 'participant_magic_link',
      },
    });
    expect(delivery.status).toBe('accepted');
  });

  it('answers an unknown e-mail identically, creating nothing and sending nothing', async () => {
    const { email } = await participant();
    const known = await requestLink(email);
    const unknownEmail = `nobody-${randomUUID().slice(0, 8)}@example.test`;
    sent = [];
    const unknown = await requestLink(unknownEmail);

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(sent).toHaveLength(0);
    expect(
      await prisma.participantAccount.count({ where: { email: unknownEmail } }),
    ).toBe(0);
  });

  it('does not treat an account without registrations as known', async () => {
    const email = `bare-${randomUUID().slice(0, 8)}@example.test`;
    await prisma.participantAccount.create({ data: { email } });
    const result = await requestLink(email);
    expect(result.body.message).toBe(LINK_REQUESTED_MESSAGE);
    expect(sent).toHaveLength(0);
  });

  it('treats spacing and case of the e-mail as the same account', async () => {
    const { email } = await participant();
    await requestLink(`  ${email.toUpperCase()} `);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(email);
  });

  it('rejects a malformed e-mail', async () => {
    const result = await call('POST', '/participant/magic-links', {
      body: { email: 'not-an-email' },
    });
    expect(result.status).toBe(400);
  });

  it('sends at most 3 links per 15 minutes and answers the same after that', async () => {
    const { email } = await participant();
    const answers: Call[] = [];
    for (const variant of [email, ` ${email} `, email.toUpperCase(), email]) {
      answers.push(await requestLink(variant));
    }

    expect(sent).toHaveLength(3);
    expect(new Set(answers.map((a) => JSON.stringify(a.body))).size).toBe(1);
    expect(new Set(answers.map((a) => a.status)).size).toBe(1);
  });

  it('holds the limit under concurrent requests and e-mail variants', async () => {
    const { email } = await participant();
    const variants = Array.from({ length: 12 }, (_, i) =>
      i % 2 ? email.toUpperCase() : ` ${email}`,
    );
    const answers = await Promise.all(
      variants.map((variant) =>
        call('POST', '/participant/magic-links', { body: { email: variant } }),
      ),
    );
    await access.settleDeliveries();

    expect(sent).toHaveLength(3);
    expect(new Set(answers.map((a) => JSON.stringify(a.body))).size).toBe(1);
  });

  it('allows a new link once the oldest leaves the 15-minute window', async () => {
    const { email } = await participant();
    const start = new Date(Date.now() - 20 * 60 * 1000);
    for (const offset of [0, 1, 2]) {
      await access.requestLink(
        email,
        new Date(start.getTime() + offset * 60000),
      );
    }
    await access.settleDeliveries();
    expect(sent).toHaveLength(3);

    // 14 minutes after the first: still inside its window
    await access.requestLink(email, new Date(start.getTime() + 14 * 60000));
    await access.settleDeliveries();
    expect(sent).toHaveLength(3);

    // 15 minutes after the first, the second and third still count: 2 < 3
    await access.requestLink(email, new Date(start.getTime() + 15 * 60000));
    await access.settleDeliveries();
    expect(sent).toHaveLength(4);
  });

  it('keeps a failed send traceable without the token and still answers normally', async () => {
    const { email, accountId } = await participant();
    failSending = true;
    const result = await requestLink(email);

    expect(result.status).toBe(200);
    expect(result.body.message).toBe(LINK_REQUESTED_MESSAGE);
    const delivery = await prisma.emailDelivery.findFirstOrThrow({
      where: {
        participantAccountId: accountId,
        type: 'participant_magic_link',
      },
    });
    expect(delivery.status).toBe('failed');
    expect(delivery.errorMessage).toContain('provider said no');
  });
});

describe('opening a link', () => {
  it('opens a 7-day session cookie that reaches the participant', async () => {
    const { email } = await participant();
    await requestLink(email);
    const opened = await call('POST', '/participant/session', {
      body: { token: tokenOf(sent[0]) },
    });

    expect(opened.status).toBe(204);
    expect(opened.cookie).toContain(`${PARTICIPANT_SESSION_COOKIE}=`);
    expect(opened.cookie).toContain('HttpOnly');
    expect(opened.cookie).toContain('SameSite=Lax');
    expect(opened.cookie).toContain('Path=/api');

    const cookie = (opened.cookie as string).split(';')[0];
    const me = await call('GET', '/participant/me', { cookie });
    expect(me.body).toEqual({ email });

    const session = await prisma.participantSession.findFirstOrThrow({
      where: { participantAccount: { email } },
    });
    const days =
      (session.expiresAt.getTime() - session.createdAt.getTime()) / 86_400_000;
    expect(days).toBe(7);
    expect(session.tokenHash).not.toContain(cookie.split('=')[1]);
  });

  it('works once: a second use is refused', async () => {
    const { email } = await participant();
    await requestLink(email);
    const body = { token: tokenOf(sent[0]) };

    expect((await call('POST', '/participant/session', { body })).status).toBe(
      204,
    );
    const again = await call('POST', '/participant/session', { body });
    expect(again.status).toBe(401);
    expect(again.body.code).toBe('magic_link_invalid');
    expect(again.cookie).toBeNull();
  });

  it('works exactly once under concurrent use', async () => {
    const { email, accountId } = await participant();
    await requestLink(email);
    const body = { token: tokenOf(sent[0]) };

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        call('POST', '/participant/session', { body }),
      ),
    );

    expect(results.filter((r) => r.status === 204)).toHaveLength(1);
    expect(results.filter((r) => r.status === 401)).toHaveLength(7);
    expect(
      await prisma.participantSession.count({
        where: { participantAccountId: accountId },
      }),
    ).toBe(1);
  });

  it('refuses unknown and malformed tokens', async () => {
    for (const token of ['', 'x', 'A'.repeat(43), `${'A'.repeat(42)}!`]) {
      const result = await call('POST', '/participant/session', {
        body: { token },
      });
      expect(result.status).toBe(401);
      expect(result.body.code).toBe('magic_link_invalid');
    }
  });

  it('refuses an expired link, valid until the moment before expiresAt', async () => {
    const { email } = await participant();
    await requestLink(email);
    const token = tokenOf(sent[0]);
    const link = await prisma.participantMagicLink.findUniqueOrThrow({
      where: { tokenHash: hashToken(token) },
    });

    // at expiresAt it no longer works...
    await expect(
      access.openSession(token, link.expiresAt),
    ).rejects.toMatchObject({ response: { code: 'magic_link_invalid' } });
    // ...and the failed attempt did not spend it
    const opened = await access.openSession(
      token,
      new Date(link.expiresAt.getTime() - 1),
    );
    expect(opened.token).toBeTruthy();
  });
});

describe('the session', () => {
  it('is refused without a cookie, with a made-up one, and for the probe endpoint', async () => {
    for (const path of ['/participant/me', '/participant-probe']) {
      const none = await call('GET', path);
      expect(none.status).toBe(401);
      expect(none.body.code).toBe('participant_session_required');
      const fake = await call('GET', path, {
        cookie: `${PARTICIPANT_SESSION_COOKIE}=${'A'.repeat(43)}`,
      });
      expect(fake.status).toBe(401);
    }
  });

  it('lets the shared guard identify the participant to another endpoint', async () => {
    const { email } = await participant();
    const cookie = await signIn(email);
    const result = await call('GET', '/participant-probe', { cookie });
    expect(result.body).toEqual({ email });
  });

  it('is valid for 7 days from verification, not a moment longer', async () => {
    const { email } = await participant();
    await requestLink(email);
    const verified = new Date();
    const { token, expiresAt } = await access.openSession(
      tokenOf(sent[0]),
      verified,
    );

    expect(expiresAt.getTime() - verified.getTime()).toBe(7 * 86_400_000);
    expect(
      await access.identify(token, new Date(expiresAt.getTime() - 1)),
    ).toMatchObject({ email });
    expect(await access.identify(token, expiresAt)).toBeNull();
  });

  it('ends at logout, also for a direct request afterwards', async () => {
    const { email } = await participant();
    const cookie = await signIn(email);

    const out = await call('POST', '/participant/logout', { cookie });
    expect(out.status).toBe(204);
    expect(out.cookie).toContain(`${PARTICIPANT_SESSION_COOKIE}=;`);

    const after = await call('GET', '/participant-probe', { cookie });
    expect(after.status).toBe(401);
    expect(after.body.code).toBe('participant_session_required');
  });

  it('logs out quietly when there is no session', async () => {
    expect((await call('POST', '/participant/logout')).status).toBe(204);
  });

  it('belongs to one account: another participant is never visible', async () => {
    const a = await participant();
    const b = await participant();
    const cookieA = await signIn(a.email);
    await signIn(b.email);

    expect(
      (await call('GET', '/participant/me', { cookie: cookieA })).body.email,
    ).toBe(a.email);
  });

  it('is not an organizer sign-in: the same e-mail as an organizer gains nothing', async () => {
    const { email } = await participant();
    const now = new Date();
    await prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Same e-mail organizer',
        email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    await signIn(email);

    // Only the participant tables are written; no organizer session exists.
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);
  });
});
