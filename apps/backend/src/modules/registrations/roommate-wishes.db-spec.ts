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
import { EventRoommateWishesController } from '@/modules/registrations/controllers/event-roommate-wishes.controller';
import { ParticipantRoommateWishesController } from '@/modules/registrations/controllers/participant-roommate-wishes.controller';
import { RoommateWishesRepository } from '@/modules/registrations/repositories/roommate-wishes.repository';
import { RoommateWishesService } from '@/modules/registrations/services/roommate-wishes.service';
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

// S4-05 (#339) through the HTTP API against a real database: a confirmed
// participant picks other confirmed participants of the event, the list is
// one-sided and for the whole event, and only its author and the event's
// organizer read it. Participant sessions are real (S2-13); the BetterAuth
// session is replaced by `x-test-user`. Needs a migrated Postgres:
// `pnpm backend test:db`.

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
      ParticipantRoommateWishesController,
      EventRoommateWishesController,
      ParticipantAccessController,
    ],
    providers: [
      RoommateWishesService,
      RoommateWishesRepository,
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

type Fixture = {
  owner: User;
  organization: Organization;
  event: Event;
  terms: EventTerm[];
};

const setup = async (): Promise<Fixture> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: 'open',
    terms: [
      { label: 'T1', startDate: '2027-07-01', endDate: '2027-07-07' },
      { label: 'T2', startDate: '2027-07-15', endDate: '2027-07-21' },
    ],
  });
  return { owner, organization, ...created };
};

type Person = { registration: Registration; cookie: string; path: string };

/** A registration named `name` with one status per term, signed in. */
const person = async (
  f: Fixture,
  name: string,
  statuses: ParticipationStatus[],
): Promise<Person> => {
  const email = `p-${randomUUID().slice(0, 8)}@example.test`;
  const created = await createRegistration(prisma, {
    event: f.event,
    terms: statuses.map((status, index) => ({ term: f.terms[index], status })),
    email,
  });
  const [firstName, lastName] = name.split(' ');
  const registration = await prisma.registration.update({
    where: { id: created.id },
    data: { firstName, lastName },
  });
  return {
    registration,
    cookie: await signIn(email),
    path: `participant/registrations/${registration.id}/roommate-wishes`,
  };
};

const roommate = (p: Person): { registrationId: string; name: string } => ({
  registrationId: p.registration.id,
  name: `${p.registration.firstName} ${p.registration.lastName}`,
});

const save = (p: Person, ids: string[]): Promise<Call> =>
  call('PUT', p.path, { cookie: p.cookie, body: { registrationIds: ids } });

describe('roommate wishes of a confirmed participant', () => {
  it('offers the other confirmed participants of the event, never oneself', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['pending', 'confirmed']);
    await person(f, 'Petr Waiting', ['waitlisted']);
    await person(f, 'Eva Cancelled', ['cancelled']);
    const other = await setup();
    await person(other, 'Cizí Akce', ['confirmed']);

    expect(await call('GET', jana.path, { cookie: jana.cookie })).toMatchObject(
      {
        status: 200,
        body: { candidates: [roommate(anna)], wishes: [] },
      },
    );
  });

  it('stores the whole list at once, one-sided, and changes or removes it', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    const eva = await person(f, 'Eva Malá', ['confirmed', 'confirmed']);

    const saved = await save(jana, [eva.registration.id, anna.registration.id]);
    expect(saved.status).toBe(200);
    // By name; the chosen ones need not wish back.
    expect(saved.body.wishes).toEqual([roommate(anna), roommate(eva)]);
    expect(
      (await call('GET', anna.path, { cookie: anna.cookie })).body.wishes,
    ).toEqual([]);
    // For the whole event: one row each, not one per term.
    expect(
      await prisma.roommateWish.count({
        where: { fromRegistrationId: jana.registration.id },
      }),
    ).toBe(2);

    expect((await save(jana, [anna.registration.id])).body.wishes).toEqual([
      roommate(anna),
    ]);
    expect((await save(jana, [])).body.wishes).toEqual([]);
    expect(
      await prisma.roommateWish.count({
        where: { fromRegistrationId: jana.registration.id },
      }),
    ).toBe(0);
  });

  it('saves two people choosing each other at the same moment', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);

    // Each save locks its author and checks the other's key; repeated, so a
    // lock that blocks those checks would deadlock one of them.
    for (let round = 0; round < 5; round += 1) {
      const both = round % 2 === 0;
      const results = await Promise.all([
        save(jana, both ? [anna.registration.id] : []),
        save(anna, both ? [jana.registration.id] : []),
      ]);
      expect(results.map((r) => r.status)).toEqual([200, 200]);
    }
    expect(
      await prisma.roommateWish.count({
        where: { eventId: f.event.id },
      }),
    ).toBe(2);
  });

  it('keeps a wish for someone no longer confirmed, but never adds one', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    const eva = await person(f, 'Eva Malá', ['confirmed']);
    await save(jana, [anna.registration.id]);
    await prisma.registrationTerm.updateMany({
      where: { registrationId: anna.registration.id },
      data: { status: 'cancelled' },
    });

    const read = await call('GET', jana.path, { cookie: jana.cookie });
    expect(read.body).toEqual({
      candidates: [roommate(eva)],
      wishes: [roommate(anna)],
    });
    // Editing the rest keeps Anna; choosing her anew would not be allowed.
    expect(
      (await save(jana, [anna.registration.id, eva.registration.id])).status,
    ).toBe(200);
    await save(jana, [eva.registration.id]);
    expect((await save(jana, [anna.registration.id])).body).toMatchObject({
      code: 'roommate_invalid',
    });
  });

  it('refuses oneself, a repeat or someone outside the candidates, and stores nothing', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    const waiting = await person(f, 'Petr Waiting', ['waitlisted']);
    const other = await setup();
    const stranger = await person(other, 'Cizí Akce', ['confirmed']);

    for (const ids of [
      [jana.registration.id],
      [anna.registration.id, anna.registration.id],
      [waiting.registration.id],
      [stranger.registration.id],
      [randomUUID()],
    ]) {
      const refused = await save(jana, ids);
      expect(refused).toMatchObject({
        status: 400,
        body: { code: 'roommate_invalid' },
      });
    }
    expect((await save(jana, ['not-a-uuid'])).status).toBe(400);
    expect(
      (await call('PUT', jana.path, { cookie: jana.cookie, body: {} })).status,
    ).toBe(400);
    expect(
      await prisma.roommateWish.count({
        where: { fromRegistrationId: jana.registration.id },
      }),
    ).toBe(0);
  });
});

describe('who can use and read the wishes', () => {
  it('is only for a registration confirmed in at least one term', async () => {
    const f = await setup();
    const waiting = await person(f, 'Petr Waiting', ['waitlisted', 'pending']);
    await person(f, 'Anna Procházková', ['confirmed']);

    for (const result of [
      await call('GET', waiting.path, { cookie: waiting.cookie }),
      await save(waiting, []),
    ]) {
      expect(result).toMatchObject({
        status: 404,
        body: { code: 'roommate_wishes_unavailable' },
      });
    }
  });

  it('hides another participant’s list, the same as a missing one', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    await save(jana, [anna.registration.id]);

    for (const result of [
      await call('GET', jana.path, { cookie: anna.cookie }),
      await save({ ...jana, cookie: anna.cookie }, []),
      await call(
        'GET',
        `participant/registrations/${randomUUID()}/roommate-wishes`,
        { cookie: anna.cookie },
      ),
    ]) {
      expect(result.status).toBe(404);
    }
    expect((await call('GET', jana.path)).status).toBe(401);
    expect(
      await prisma.roommateWish.count({
        where: { fromRegistrationId: jana.registration.id },
      }),
    ).toBe(1);
  });

  it('shows the event’s organizer the wishes, and nobody else', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    await save(jana, [anna.registration.id]);
    const path = `organizations/${f.organization.id}/events/${f.event.id}/registrations/${jana.registration.id}/roommate-wishes`;

    expect(await call('GET', path, { userId: f.owner.id })).toMatchObject({
      status: 200,
      body: { wishes: [roommate(anna)] },
    });
    const other = await setup();
    expect((await call('GET', path, { userId: other.owner.id })).status).toBe(
      404,
    );
    const foreign = `organizations/${other.organization.id}/events/${other.event.id}/registrations/${jana.registration.id}/roommate-wishes`;
    expect(
      (await call('GET', foreign, { userId: other.owner.id })).status,
    ).toBe(404);
  });
});
