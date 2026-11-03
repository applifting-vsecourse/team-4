import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { EventRegistrationsController } from '@/modules/registrations/controllers/event-registrations.controller';
import { ParticipantRegistrationsController } from '@/modules/registrations/controllers/participant-registrations.controller';
import { PublicRegistrationsController } from '@/modules/registrations/controllers/public-registrations.controller';
import { RegistrationChangesController } from '@/modules/registrations/controllers/registration-changes.controller';
import {
  NO_NEEDS,
  RegistrationNeeds,
} from '@/modules/registrations/domain/registration-needs';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { ParticipantRegistrationsRepository } from '@/modules/registrations/repositories/participant-registrations.repository';
import { RegistrationChangesRepository } from '@/modules/registrations/repositories/registration-changes.repository';
import { RegistrationsRepository } from '@/modules/registrations/repositories/registrations.repository';
import { EventRegistrationsService } from '@/modules/registrations/services/event-registrations.service';
import { ParticipantRegistrationsService } from '@/modules/registrations/services/participant-registrations.service';
import { RegistrationChangesService } from '@/modules/registrations/services/registration-changes.service';
import { RegistrationConfirmationService } from '@/modules/registrations/services/registration-confirmation.service';
import { RegistrationsService } from '@/modules/registrations/services/registrations.service';
import { confirmationProviders, Mailbox } from '@/testing/confirmation-mail';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createRegistration,
} from '@/testing/factories';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// F63 through the HTTP API against a real database: transport, diet and
// health in a new registration, in the participant's change (F35-2a) and in
// the organizer's correction, as both sides read them. Both guards are
// replaced: `x-test-account` names the participant and `x-test-user` the
// organizer. Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: object): Promise<string> =>
    Promise.resolve(JSON.stringify(props)),
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
let confirmation: RegistrationConfirmationService;
const mailbox = new Mailbox();

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [
      PublicRegistrationsController,
      ParticipantRegistrationsController,
      RegistrationChangesController,
      EventRegistrationsController,
    ],
    providers: [
      RegistrationsService,
      RegistrationsRepository,
      ParticipantRegistrationsService,
      ParticipantRegistrationsRepository,
      RegistrationChangesService,
      RegistrationChangesRepository,
      EventRegistrationsService,
      EventRegistrationsRepository,
      ...confirmationProviders(mailbox),
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
  confirmation = app.get(RegistrationConfirmationService);
});

afterAll(() => app.close());

beforeEach(async () => {
  await confirmation.settle();
  mailbox.reset();
});

type Who = { account?: string; user?: string };

type Response<T> = { status: number; body: T; text: string };

const call = async <T = Record<string, unknown>>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  who: Who,
  body?: unknown,
): Promise<Response<T>> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(who.account ? { 'x-test-account': who.account } : {}),
      ...(who.user ? { 'x-test-user': who.user } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: (text ? JSON.parse(text) : null) as T,
    text,
  };
};

type Detail = { needs: RegistrationNeeds; version: number };

const inDays = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

type Fixture = CreatedEvent & { ownerId: string; organizationId: string };

/** Terms: [0] +5 days, [1] +60 days. */
const setup = async (approvalDays: number | null = null): Promise<Fixture> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: 'open',
    terms: [
      {
        label: 'Turnus 1',
        startDate: inDays(5),
        endDate: inDays(7),
        priceMinor: 240_000,
      },
      {
        label: 'Turnus 2',
        startDate: inDays(60),
        endDate: inDays(62),
        priceMinor: 240_000,
      },
    ],
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

const FILLED: RegistrationNeeds = {
  transport: 'shared',
  transportNote: 'Nastupujeme v Pardubicích.',
  hasNoDietRestriction: false,
  diet: ['vegetarian', 'lactose_free'],
  dietNote: 'Bez ořechů.',
  health: 'Astma, nosí inhalátor.\nPotřebuje delší přestávky.',
};

const form = (fixture: Fixture, needs?: unknown): Record<string, unknown> => ({
  submissionKey: randomUUID(),
  firstName: 'Jana',
  lastName: 'Nováková',
  email: `jana-${randomUUID().slice(0, 8)}@example.test`,
  phone: '+420 777 123 456',
  termIds: [fixture.terms[1].id],
  ...(needs === undefined ? {} : { needs }),
});

const publicSubmit = (
  fixture: Fixture,
  body: unknown,
): Promise<Response<{ id: string; code?: string }>> =>
  call(
    'POST',
    `public/events/${fixture.event.publicId}/registrations`,
    {},
    body,
  );

const ownDetail = (
  registration: Pick<Registration, 'id'>,
  account: string,
): Promise<Response<Detail>> =>
  call('GET', `participant/registrations/${registration.id}`, {
    account,
  });

const managed = (fixture: Fixture, registrationId: string): string =>
  `organizations/${fixture.organizationId}/events/${fixture.event.id}/registrations/${registrationId}`;

const organizerDetail = (
  fixture: Fixture,
  registrationId: string,
): Promise<Response<Detail>> =>
  call('GET', managed(fixture, registrationId), {
    user: fixture.ownerId,
  });

const register = (
  fixture: Fixture,
  termIndexes: number[] = [0, 1],
): Promise<Registration> =>
  createRegistration(prisma, {
    event: fixture.event,
    terms: termIndexes.map((index) => ({
      term: fixture.terms[index],
      status: 'confirmed',
    })),
  });

const stored = (registrationId: string): Promise<Registration> =>
  prisma.registration.findUniqueOrThrow({ where: { id: registrationId } });

/** Reviews and submits a participant change the way the form does. */
type Submitted = {
  outcome: string;
  change: { id: string; summary: { needs: unknown } };
};

const change = async (
  registration: Registration,
  needs: unknown,
): Promise<Response<Submitted>> => {
  const who = { account: registration.participantAccountId };
  const base = `participant/registrations/${registration.id}/changes`;
  const proposal = { needs, moves: [], cancelledTermIds: [] };
  const preview = await call<{ version: number; requiresApproval: boolean }>(
    'POST',
    `${base}/preview`,
    who,
    proposal,
  );
  expect(preview.status).toBe(200);
  return call<Submitted>('POST', base, who, {
    ...proposal,
    expectedVersion: preview.body.version,
    expectsApproval: preview.body.requiresApproval,
  });
};

describe('a new registration', () => {
  it('stores the needs once and shows them to the participant and the organizer', async () => {
    const fixture = await setup();

    const result = await publicSubmit(
      fixture,
      form(fixture, {
        ...FILLED,
        diet: ['lactose_free', 'vegetarian'],
        dietNote: '  Bez ořechů.  ',
      }),
    );

    expect(result.status).toBe(201);
    // The public result and the confirmation carry none of it.
    expect(result.text).not.toContain('inhalátor');
    const row = await stored(result.body.id);
    const own = await ownDetail(row, row.participantAccountId);
    expect(own.body.needs).toEqual(FILLED);
    const organizer = await organizerDetail(fixture, row.id);
    expect(organizer.body.needs).toEqual(FILLED);
  });

  it('saves a registration without needs as not provided, never as "Bez omezení"', async () => {
    const fixture = await setup();

    const result = await publicSubmit(fixture, form(fixture));

    expect(result.status).toBe(201);
    const organizer = await organizerDetail(fixture, result.body.id);
    expect(organizer.body.needs).toEqual(NO_NEEDS);
  });

  it.each([
    ['"Bez omezení" with a diet', { hasNoDietRestriction: true }],
    ['an unknown diet', { diet: ['paleo'] }],
    ['an unknown transport', { transport: 'bus' }],
    ['a health text over 2000 characters', { health: 'x'.repeat(2001) }],
  ])('refuses %s and saves nothing', async (_, override) => {
    const fixture = await setup();

    const result = await publicSubmit(
      fixture,
      form(fixture, { ...FILLED, ...override }),
    );

    expect(result.status).toBe(400);
    expect(
      await prisma.registration.count({ where: { eventId: fixture.event.id } }),
    ).toBe(0);
  });

  it('takes a retry with other needs as another submission of the same key', async () => {
    const fixture = await setup();
    const body = form(fixture, FILLED);
    expect((await publicSubmit(fixture, body)).status).toBe(201);

    const retry = await publicSubmit(fixture, {
      ...body,
      needs: { ...FILLED, health: '' },
    });

    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe('submission_key_reused');
  });
});

describe('the participant changes the needs (F35-2a)', () => {
  it('changes them at once without a threshold', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture);

    const result = await change(registration, FILLED);

    expect(result.body.outcome).toBe('applied');
    expect(result.body.change.summary.needs).toEqual({
      original: NO_NEEDS,
      proposed: FILLED,
    });
    const organizer = await organizerDetail(fixture, registration.id);
    expect(organizer.body).toMatchObject({ needs: FILLED, version: 1 });
  });

  it('keeps the original needs until the organizer approves, judged by every active term', async () => {
    // Turnus 1 starts within the threshold, so the whole registration waits.
    const fixture = await setup(14);
    const registration = await register(fixture);

    const result = await change(registration, FILLED);

    expect(result.body.outcome).toBe('requested');
    const own = await ownDetail(
      registration,
      registration.participantAccountId,
    );
    expect(own.body.needs).toEqual(NO_NEEDS);

    const approved = await call(
      'POST',
      `${managed(fixture, registration.id)}/changes/${result.body.change.id}/approve`,
      { user: fixture.ownerId },
    );
    expect(approved.status).toBe(200);
    const after = await ownDetail(
      registration,
      registration.participantAccountId,
    );
    expect(after.body.needs).toEqual(FILLED);
  });

  it('clears the needs again', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture);
    await change(registration, FILLED);

    const result = await change(registration, NO_NEEDS);

    expect(result.body.outcome).toBe('applied');
    const row = await stored(registration.id);
    expect(row).toMatchObject({ ...NO_NEEDS, version: 2 });
  });

  it('refuses "Bez omezení" with a diet and changes nothing', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture);

    const result = await call(
      'POST',
      `participant/registrations/${registration.id}/changes/preview`,
      { account: registration.participantAccountId },
      {
        needs: { ...FILLED, hasNoDietRestriction: true },
        moves: [],
        cancelledTermIds: [],
      },
    );

    expect(result.status).toBe(400);
    expect(await stored(registration.id)).toMatchObject({ version: 0 });
  });
});

describe('the organizer corrects the needs', () => {
  it('changes only the needs, at once, and both sides see the same values', async () => {
    const fixture = await setup(14);
    const registration = await register(fixture);

    const result = await call<Detail>(
      'PUT',
      `${managed(fixture, registration.id)}/needs`,
      { user: fixture.ownerId },
      { expectedVersion: 0, needs: FILLED },
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ needs: FILLED, version: 1 });
    const own = await ownDetail(
      registration,
      registration.participantAccountId,
    );
    expect(own.body.needs).toEqual(FILLED);
    const row = await stored(registration.id);
    expect(row).toMatchObject({
      firstName: registration.firstName,
      phone: registration.phone,
    });
  });

  it('refuses a correction made on an older version and keeps the newer data', async () => {
    const fixture = await setup(null);
    const registration = await register(fixture);
    await change(registration, FILLED);

    const result = await call(
      'PUT',
      `${managed(fixture, registration.id)}/needs`,
      { user: fixture.ownerId },
      { expectedVersion: 0, needs: NO_NEEDS },
    );

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('registration_stale');
    expect(await stored(registration.id)).toMatchObject(FILLED);
  });

  it('refuses "Bez omezení" with a diet', async () => {
    const fixture = await setup();
    const registration = await register(fixture);

    const result = await call(
      'PUT',
      `${managed(fixture, registration.id)}/needs`,
      { user: fixture.ownerId },
      { expectedVersion: 0, needs: { ...FILLED, hasNoDietRestriction: true } },
    );

    expect(result.status).toBe(400);
    expect(await stored(registration.id)).toMatchObject({ version: 0 });
  });

  it('reaches no registration of another organizer or event', async () => {
    const fixture = await setup();
    const registration = await register(fixture);
    const stranger = await setup();

    const asStranger = await call(
      'PUT',
      `${managed(fixture, registration.id)}/needs`,
      { user: stranger.ownerId },
      { expectedVersion: 0, needs: FILLED },
    );
    const otherEvent = await call(
      'PUT',
      `${managed(stranger, registration.id)}/needs`,
      { user: stranger.ownerId },
      { expectedVersion: 0, needs: FILLED },
    );
    const read = await call('GET', managed(fixture, registration.id), {
      user: stranger.ownerId,
    });

    expect([asStranger.status, otherEvent.status, read.status]).toEqual([
      404, 404, 404,
    ]);
    expect(await stored(registration.id)).toMatchObject(NO_NEEDS);
  });
});

describe('the database', () => {
  it('never stores "Bez omezení" together with a diet choice', async () => {
    const fixture = await setup();
    const registration = await register(fixture);

    await expect(
      prisma.registration.update({
        where: { id: registration.id },
        data: { hasNoDietRestriction: true, diet: ['vegan'] },
      }),
    ).rejects.toThrow(/registration_diet_exclusive_chk/);
  });
});
