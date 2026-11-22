import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ParticipationStatus, Registration } from '@/generated/prisma/client';
import { ParticipantPlacementsController } from '@/modules/accommodation/controllers/participant-placements.controller';
import { ParticipantPlacementsRepository } from '@/modules/accommodation/repositories/participant-placements.repository';
import { ParticipantPlacementsService } from '@/modules/accommodation/services/participant-placements.service';
import { ParticipantAccessController } from '@/modules/participant-access/controllers/participant-access.controller';
import { ParticipantSessionGuard } from '@/modules/participant-access/guards/participant-session.guard';
import { ParticipantAccessRepository } from '@/modules/participant-access/repositories/participant-access.repository';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { Config } from '@/shared/config/config.service';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createOrganizer,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';

// S4-02 (#341) through the HTTP API against a real database: a confirmed
// participant reads their own room and the state of their own roommate
// wishes, only for the terms whose placements the organizer published.
// Participant sessions are real (S2-13). Needs a migrated Postgres:
// `pnpm backend test:db`.

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
    controllers: [ParticipantPlacementsController, ParticipantAccessController],
    providers: [
      ParticipantPlacementsService,
      ParticipantPlacementsRepository,
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
  options: { body?: unknown; cookie?: string } = {},
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
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
  await call('POST', 'participant/magic-links', { body: { email } });
  await access.settleDeliveries();
  const token = /verify\?token=([A-Za-z0-9_-]+)/.exec(
    html[html.length - 1],
  )?.[1];
  const opened = await call('POST', 'participant/session', { body: { token } });
  expect(opened.status).toBe(204);
  return (opened.cookie as string).split(';')[0];
};

type Fixture = CreatedEvent & { ownerId: string };

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
    rooms: [
      { label: 'Chatka A', baseBeds: 3, termIndexes: [0, 1] },
      { label: 'Chatka B', baseBeds: 3, termIndexes: [0, 1] },
    ],
  });
  return { ...created, ownerId: owner.id };
};

type Person = { registration: Registration; email: string };

/** A registration named `name` with one status per term. */
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
  return { registration, email };
};

const place = (
  f: Fixture,
  p: Person,
  roomIndex: number,
  termIndex = 0,
): Promise<unknown> =>
  prisma.roomPlacement.create({
    data: {
      registrationId: p.registration.id,
      termId: f.terms[termIndex].id,
      eventId: f.event.id,
      roomId: f.rooms[roomIndex].id,
      placedById: f.ownerId,
    },
  });

const publish = (f: Fixture, termIndex = 0): Promise<unknown> =>
  prisma.roomPublication.create({
    data: {
      termId: f.terms[termIndex].id,
      eventId: f.event.id,
      publishedById: f.ownerId,
    },
  });

const wish = (f: Fixture, from: Person, to: Person): Promise<unknown> =>
  prisma.roommateWish.create({
    data: {
      eventId: f.event.id,
      fromRegistrationId: from.registration.id,
      toRegistrationId: to.registration.id,
    },
  });

/** The participant's own read, signed in as `as` (the author by default). */
const read = async (p: Person, as: Person = p): Promise<Call> =>
  call(
    'GET',
    `participant/registrations/${p.registration.id}/room-placements`,
    { cookie: await signIn(as.email) },
  );

type TermView = {
  label: string;
  isPublished: boolean;
  room?: { label: string } | null;
  wishes?: { registrationId: string; name: string; state: string }[];
};

const term = (body: { terms: TermView[] }, label: string): TermView =>
  body.terms.find((t) => t.label === label)!;

describe('the own room placements of a participant', () => {
  it('hides the room and wishes of a term that is not published', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    await place(f, jana, 0);
    await wish(f, jana, anna);

    const { status, body } = await read(jana);
    expect(status).toBe(200);
    expect(body).toEqual({
      terms: [
        {
          termId: f.terms[0].id,
          label: 'T1',
          startDate: '2027-07-01',
          endDate: '2027-07-07',
          isPublished: false,
        },
      ],
    });
  });

  it('shows the own room and the state of each own wish of a published term', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    const petr = await person(f, 'Petr Dvořák', ['confirmed']);
    const eva = await person(f, 'Eva Bez', ['confirmed']);
    await place(f, jana, 0);
    await place(f, anna, 0);
    await place(f, petr, 1);
    await wish(f, jana, anna);
    await wish(f, jana, petr);
    await wish(f, jana, eva);
    // Someone else's wish for Jana is not hers to see.
    await wish(f, petr, jana);
    await publish(f);

    const { body } = await read(jana);
    expect(term(body, 'T1')).toEqual({
      termId: f.terms[0].id,
      label: 'T1',
      startDate: '2027-07-01',
      endDate: '2027-07-07',
      isPublished: true,
      room: { label: 'Chatka A' },
      wishes: [
        {
          registrationId: anna.registration.id,
          name: 'Anna Procházková',
          state: 'satisfied',
        },
        {
          registrationId: eva.registration.id,
          name: 'Eva Bez',
          state: 'unplaced',
        },
        {
          registrationId: petr.registration.id,
          name: 'Petr Dvořák',
          state: 'unsatisfied',
        },
      ],
    });
  });

  it('says there is no room yet in a published term without one', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    await place(f, anna, 0);
    await wish(f, jana, anna);
    await publish(f);

    const t1 = term((await read(jana)).body, 'T1');
    expect(t1.room).toBeNull();
    expect(t1.wishes).toEqual([
      expect.objectContaining({ name: 'Anna Procházková', state: 'unplaced' }),
    ]);
  });

  it('has no wishes in a term where the wished person is not confirmed', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed', 'confirmed']);
    const anna = await person(f, 'Anna Procházková', ['pending', 'confirmed']);
    await wish(f, jana, anna);
    await publish(f, 0);
    await publish(f, 1);

    const { body } = await read(jana);
    expect(term(body, 'T1').wishes).toEqual([]);
    expect(term(body, 'T2').wishes).toEqual([
      expect.objectContaining({ name: 'Anna Procházková' }),
    ]);
  });

  it('decides the publication per term', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed', 'confirmed']);
    await place(f, jana, 0, 0);
    await place(f, jana, 1, 1);
    await publish(f, 1);

    const { body } = await read(jana);
    expect(body.terms.map((t: { label: string }) => t.label)).toEqual([
      'T1',
      'T2',
    ]);
    expect(term(body, 'T1')).toEqual(
      expect.objectContaining({ isPublished: false }),
    );
    expect(term(body, 'T1').room).toBeUndefined();
    expect(term(body, 'T2').room).toEqual({ label: 'Chatka B' });
  });

  it('hides a withdrawn publication and shows the current room once published again', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    await place(f, jana, 0);
    await publish(f);
    expect(term((await read(jana)).body, 'T1').room).toEqual({
      label: 'Chatka A',
    });

    await prisma.roomPublication.delete({ where: { termId: f.terms[0].id } });
    const withdrawn = term((await read(jana)).body, 'T1');
    expect(withdrawn.isPublished).toBe(false);
    expect(withdrawn.room).toBeUndefined();

    await prisma.roomPlacement.update({
      where: {
        registrationId_termId: {
          registrationId: jana.registration.id,
          termId: f.terms[0].id,
        },
      },
      data: { roomId: f.rooms[1].id },
    });
    await publish(f);
    expect(term((await read(jana)).body, 'T1').room).toEqual({
      label: 'Chatka B',
    });
  });

  it('shows no room while the placement is in a room unavailable in the term', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    await place(f, jana, 1);
    await place(f, anna, 1);
    await wish(f, jana, anna);
    await publish(f);
    await prisma.roomTermAvailability.update({
      where: {
        roomId_termId: { roomId: f.rooms[1].id, termId: f.terms[0].id },
      },
      data: { isAvailable: false },
    });

    const t1 = term((await read(jana)).body, 'T1');
    expect(t1.room).toBeNull();
    expect(t1.wishes).toEqual([
      expect.objectContaining({ name: 'Anna Procházková', state: 'unplaced' }),
    ]);
  });

  it('drops a published term and its wishes once a participation is cancelled', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed', 'confirmed']);
    const anna = await person(f, 'Anna Procházková', [
      'confirmed',
      'confirmed',
    ]);
    await place(f, jana, 0);
    await place(f, anna, 0);
    await wish(f, jana, anna);
    await publish(f, 0);
    await publish(f, 1);
    expect(term((await read(jana)).body, 'T1').wishes).toHaveLength(1);

    // Anna leaves T1: Jana's wish no longer applies there, but still in T2.
    await prisma.registrationTerm.update({
      where: {
        registrationId_termId: {
          registrationId: anna.registration.id,
          termId: f.terms[0].id,
        },
      },
      data: { status: 'cancelled' },
    });
    let body = (await read(jana)).body;
    expect(term(body, 'T1').wishes).toEqual([]);
    expect(term(body, 'T2').wishes).toHaveLength(1);

    // Jana leaves T1: the term is gone from her rooms.
    await prisma.registrationTerm.update({
      where: {
        registrationId_termId: {
          registrationId: jana.registration.id,
          termId: f.terms[0].id,
        },
      },
      data: { status: 'cancelled' },
    });
    body = (await read(jana)).body;
    expect(body.terms.map((t: TermView) => t.label)).toEqual(['T2']);
  });

  it('leaves out a term the participant is not confirmed in', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['cancelled', 'confirmed']);
    await publish(f, 0);
    await publish(f, 1);

    const { body } = await read(jana);
    expect(body.terms.map((t: { label: string }) => t.label)).toEqual(['T2']);
  });

  it('is not available for another participant’s registration', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anna = await person(f, 'Anna Procházková', ['confirmed']);
    await place(f, jana, 0);
    await publish(f);

    const foreign = await read(jana, anna);
    expect(foreign.status).toBe(404);
    expect(JSON.stringify(foreign.body)).not.toContain('Chatka');
  });

  it('needs a participant session', async () => {
    const f = await setup();
    const jana = await person(f, 'Jana Svobodová', ['confirmed']);
    const anonymous = await call(
      'GET',
      `participant/registrations/${jana.registration.id}/room-placements`,
    );
    expect(anonymous.status).toBe(401);
  });
});
