import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Event,
  EventTerm,
  Organization,
  ParticipationStatus,
  Registration,
  User,
} from '@/generated/prisma/client';
import { ParticipantAccessController } from '@/modules/participant-access/controllers/participant-access.controller';
import { ParticipantSessionGuard } from '@/modules/participant-access/guards/participant-session.guard';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { ParticipantProgrammeController } from '@/modules/programme/controllers/participant-programme.controller';
import { ProgrammeController } from '@/modules/programme/controllers/programme.controller';
import { ProgrammeRepository } from '@/modules/programme/repositories/programme.repository';
import { ProgrammeService } from '@/modules/programme/services/programme.service';
import { Config } from '@/shared/config/config.service';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';

// F65 through the HTTP API against a real database: the organizer's writes
// and the participant's read, with the access rules between them. The
// BetterAuth session is replaced by the `x-test-user` header; participant
// sessions are real (S2-13). Needs a migrated Postgres: `pnpm backend test:db`.

jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: { url: string }): Promise<string> =>
    Promise.resolve(`<a href="${props.url}">link</a>`),
}));

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
let access: ParticipantAccessService;
let html: string[];

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [
      ProgrammeController,
      ParticipantProgrammeController,
      ParticipantAccessController,
    ],
    providers: [
      ProgrammeService,
      ProgrammeRepository,
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
            _to: string,
            _subject: string,
            body: string,
          ): Promise<void> => {
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
  method: string,
  path: string,
  options: { body?: unknown; cookie?: string; userId?: string } = {},
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.userId ? { 'x-test-user': options.userId } : {}),
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
  await call('POST', 'participant/magic-links', { body: { email } });
  await access.settleDeliveries();
  const token = /verify\?token=([A-Za-z0-9_-]+)/.exec(
    html[html.length - 1],
  )?.[1];
  const opened = await call('POST', 'participant/session', { body: { token } });
  expect(opened.status).toBe(204);
  return (opened.cookie as string).split(';')[0];
};

const T1 = { startDate: '2027-07-01', endDate: '2027-07-07', label: 'T1' };
const T2 = { startDate: '2027-07-15', endDate: '2027-07-21', label: 'T2' };

type Fixture = {
  owner: User;
  organization: Organization;
  event: Event;
  terms: EventTerm[];
  /** Path of a term's programme, by the term's index, and optionally an item. */
  path: (termIndex: number, itemId?: string) => string;
};

const setup = async (status: 'draft' | 'open' = 'open'): Promise<Fixture> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status,
    terms: [T1, T2],
  });
  const base = `organizations/${organization.id}/events/${created.event.id}/terms`;
  return {
    owner,
    organization,
    ...created,
    path: (termIndex: number, itemId?: string): string =>
      `${base}/${created.terms[termIndex].id}/programme${itemId ? `/${itemId}` : ''}`,
  };
};

const ITEM = {
  title: 'Společná večeře',
  startDate: '2027-07-02',
  startTime: '19:00',
};

const register = async (
  fixture: Fixture,
  statuses: ParticipationStatus[],
): Promise<{ registration: Registration; cookie: string }> => {
  const email = `p-${randomUUID().slice(0, 8)}@example.test`;
  const registration = await createRegistration(prisma, {
    event: fixture.event,
    terms: statuses.map((status, index) => ({
      term: fixture.terms[index],
      status,
    })),
    email,
  });
  return { registration, cookie: await signIn(email) };
};

describe('organizer programme', () => {
  it('adds, edits and deletes items, read back chronologically', async () => {
    const f = await setup();
    const opts = { userId: f.owner.id };

    const empty = await call('GET', f.path(0), opts);
    expect(empty.body).toEqual({ items: [] });

    await call('POST', f.path(0), {
      ...opts,
      body: {
        title: 'Snídaně',
        startDate: '2027-07-03',
        startTime: '8:30'.padStart(5, '0'),
      },
    });
    const added = await call('POST', f.path(0), {
      ...opts,
      body: { ...ITEM, place: ' Jídelna ', description: '  ' },
    });
    expect(added.status).toBe(201);
    expect(added.body.items.map((i: { title: string }) => i.title)).toEqual([
      'Společná večeře',
      'Snídaně',
    ]);
    expect(added.body.items[0]).toMatchObject({
      place: 'Jídelna',
      description: null,
      startDate: '2027-07-02',
      startTime: '19:00',
    });

    const id = added.body.items[0].id as string;
    const edited = await call('PUT', f.path(0, id), {
      ...opts,
      body: { ...ITEM, title: 'Večeře', startDate: '2027-07-04' },
    });
    expect(edited.status).toBe(200);
    expect(edited.body.items.at(-1)).toMatchObject({
      id,
      title: 'Večeře',
      place: null,
    });

    const removed = await call('DELETE', f.path(0, id), opts);
    expect(removed.status).toBe(200);
    expect(removed.body.items).toHaveLength(1);
    expect((await call('GET', f.path(0), opts)).body.items).toHaveLength(1);
  });

  it('keeps the programmes of terms independent', async () => {
    const f = await setup();
    const opts = { userId: f.owner.id };
    await call('POST', f.path(0), { ...opts, body: ITEM });
    await call('POST', f.path(1), {
      ...opts,
      body: { ...ITEM, startDate: '2027-07-16' },
    });
    expect((await call('GET', f.path(0), opts)).body.items).toHaveLength(1);
    expect((await call('GET', f.path(1), opts)).body.items).toHaveLength(1);
  });

  it('stays editable in a locked event and changes nothing else', async () => {
    const f = await setup('open');
    const before = await prisma.eventTerm.findMany({
      where: { eventId: f.event.id },
    });
    const added = await call('POST', f.path(0), {
      userId: f.owner.id,
      body: ITEM,
    });
    expect(added.status).toBe(201);
    expect(
      await prisma.eventTerm.findMany({ where: { eventId: f.event.id } }),
    ).toEqual(before);
  });

  it('explains invalid input and saves nothing', async () => {
    const f = await setup();
    const opts = { userId: f.owner.id };
    const noTitle = await call('POST', f.path(0), {
      ...opts,
      body: { ...ITEM, title: '  ' },
    });
    expect(noTitle.status).toBe(400);
    const badTime = await call('POST', f.path(0), {
      ...opts,
      body: { ...ITEM, startTime: '25:00' },
    });
    expect(badTime.status).toBe(400);
    const badDate = await call('POST', f.path(0), {
      ...opts,
      body: { ...ITEM, startDate: '2027-02-31' },
    });
    expect(badDate.status).toBe(400);
    expect(badDate.body).toMatchObject({
      code: 'programme_date_invalid',
      field: 'startDate',
    });
    const outside = await call('POST', f.path(0), {
      ...opts,
      body: { ...ITEM, startDate: '2027-07-08' },
    });
    expect(outside.status).toBe(400);
    expect(outside.body).toMatchObject({
      code: 'programme_date_out_of_term',
      field: 'startDate',
    });
    expect((await call('GET', f.path(0), opts)).body.items).toEqual([]);
  });

  it('hides programmes of another organization and cannot move items between terms', async () => {
    const mine = await setup();
    const theirs = await setup();
    const created = await call('POST', theirs.path(0), {
      userId: theirs.owner.id,
      body: ITEM,
    });
    const foreignItem = created.body.items[0].id as string;

    const read = await call('GET', theirs.path(0), { userId: mine.owner.id });
    expect(read.status).toBe(404);
    expect(read.body.code).toBe('programme_unavailable');
    expect(
      (
        await call('POST', theirs.path(0), {
          userId: mine.owner.id,
          body: ITEM,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call('PUT', theirs.path(0, foreignItem), {
          userId: mine.owner.id,
          body: ITEM,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call('DELETE', theirs.path(0, foreignItem), {
          userId: mine.owner.id,
        })
      ).status,
    ).toBe(404);

    // Own term with a foreign item id, and the foreign term under my event.
    expect(
      (
        await call('PUT', mine.path(0, foreignItem), {
          userId: mine.owner.id,
          body: ITEM,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call('DELETE', mine.path(1, foreignItem), {
          userId: mine.owner.id,
        })
      ).status,
    ).toBe(404);
    const crossed = `organizations/${mine.organization.id}/events/${mine.event.id}/terms/${theirs.terms[0].id}/programme`;
    expect((await call('GET', crossed, { userId: mine.owner.id })).status).toBe(
      404,
    );
    expect(
      await prisma.programmeItem.count({ where: { id: foreignItem } }),
    ).toBe(1);

    const unauthenticated = await call('GET', mine.path(0));
    expect(unauthenticated.status).toBe(403);
  });
});

describe('participant programme', () => {
  const read = (
    cookie: string,
    registrationId: string,
    termId: string,
  ): Promise<Call> =>
    call(
      'GET',
      `participant/registrations/${registrationId}/terms/${termId}/programme`,
      { cookie },
    );

  it('needs a participant session', async () => {
    const f = await setup();
    const res = await call(
      'GET',
      `participant/registrations/${randomUUID()}/terms/${f.terms[0].id}/programme`,
    );
    expect(res.status).toBe(401);
  });

  it('shows confirmed terms only and follows the stored status', async () => {
    const f = await setup();
    await call('POST', f.path(0), { userId: f.owner.id, body: ITEM });
    await call('POST', f.path(1), {
      userId: f.owner.id,
      body: { ...ITEM, startDate: '2027-07-16' },
    });
    const { registration, cookie } = await register(f, [
      'confirmed',
      'waitlisted',
    ]);

    const confirmed = await read(cookie, registration.id, f.terms[0].id);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.items).toHaveLength(1);

    const waitlisted = await read(cookie, registration.id, f.terms[1].id);
    expect(waitlisted.status).toBe(404);
    expect(waitlisted.body.code).toBe('programme_unavailable');
    expect(JSON.stringify(waitlisted.body)).not.toContain(ITEM.title);

    await prisma.registrationTerm.update({
      where: {
        registrationId_termId: {
          registrationId: registration.id,
          termId: f.terms[1].id,
        },
      },
      data: { status: 'confirmed' },
    });
    expect((await read(cookie, registration.id, f.terms[1].id)).status).toBe(
      200,
    );
    await prisma.registrationTerm.update({
      where: {
        registrationId_termId: {
          registrationId: registration.id,
          termId: f.terms[0].id,
        },
      },
      data: { status: 'waitlisted' },
    });
    expect((await read(cookie, registration.id, f.terms[0].id)).status).toBe(
      404,
    );
  });

  it('shows a change at the next read and an empty programme as empty', async () => {
    const f = await setup();
    const { registration, cookie } = await register(f, ['confirmed']);
    expect((await read(cookie, registration.id, f.terms[0].id)).body).toEqual({
      items: [],
    });
    await call('POST', f.path(0), { userId: f.owner.id, body: ITEM });
    expect(
      (await read(cookie, registration.id, f.terms[0].id)).body.items,
    ).toHaveLength(1);
  });

  it('does not expose a term outside the registration or another participant’s registration', async () => {
    const f = await setup();
    await call('POST', f.path(1), {
      userId: f.owner.id,
      body: { ...ITEM, startDate: '2027-07-16' },
    });
    const mine = await register(f, ['confirmed']);
    const other = await register(f, ['confirmed', 'confirmed']);

    expect(
      (await read(mine.cookie, mine.registration.id, f.terms[1].id)).status,
    ).toBe(404);
    expect(
      (await read(mine.cookie, other.registration.id, f.terms[1].id)).status,
    ).toBe(404);
    expect((await read(mine.cookie, randomUUID(), f.terms[0].id)).status).toBe(
      404,
    );
  });
});
