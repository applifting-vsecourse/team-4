import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { RoomPublicationController } from '@/modules/accommodation/controllers/room-publication.controller';
import { RoomPublicationRepository } from '@/modules/accommodation/repositories/room-publication.repository';
import { RoomPublicationService } from '@/modules/accommodation/services/room-publication.service';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createOrganizer,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// S4-02 (#341) through the HTTP API against a real database: the organizer
// publishes the room placements of one term to its participants, or takes
// the publication back. The guard is replaced: `x-test-user` names the
// organizer. Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

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

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [RoomPublicationController],
    providers: [RoomPublicationService, RoomPublicationRepository],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

type Call = { status: number; body: ReturnType<typeof JSON.parse> };

type Fixture = CreatedEvent & {
  ownerId: string;
  /** `…/accommodation/terms/:termId/publication` of a term. */
  path: (termIndex?: number) => string;
  call: (
    method: 'GET' | 'PUT' | 'DELETE',
    path: string,
    user?: string,
  ) => Promise<Call>;
};

const setup = async (): Promise<Fixture> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: 'open',
    terms: [
      { label: 'T1', startDate: '2027-07-01', endDate: '2027-07-07' },
      { label: 'T2', startDate: '2027-08-01', endDate: '2027-08-07' },
    ],
    rooms: [{ label: 'A', baseBeds: 2, termIndexes: [0, 1] }],
  });
  const path = (termIndex = 0): string =>
    `organizations/${organization.id}/events/${created.event.id}/accommodation/terms/${created.terms[termIndex].id}/publication`;
  const call: Fixture['call'] = async (method, url, user = owner.id) => {
    const response = await fetch(`${baseUrl}/${url}`, {
      method,
      headers: { 'x-test-user': user },
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  return { ...created, ownerId: owner.id, path, call };
};

describe('publication of the room placements of a term', () => {
  it('is not published until the organizer publishes it', async () => {
    const f = await setup();
    const { status, body } = await f.call('GET', f.path());
    expect(status).toBe(200);
    expect(body).toEqual({ isPublished: false, publishedAt: null });
  });

  it('publishes, takes the publication back and publishes again', async () => {
    const f = await setup();

    const published = await f.call('PUT', f.path());
    expect(published.status).toBe(200);
    expect(published.body).toEqual({
      isPublished: true,
      publishedAt: expect.any(String),
    });
    expect((await f.call('GET', f.path())).body).toEqual(published.body);

    const again = await f.call('PUT', f.path());
    // Publishing a published term keeps when it was published.
    expect(again.body).toEqual(published.body);

    const withdrawn = await f.call('DELETE', f.path());
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body).toEqual({ isPublished: false, publishedAt: null });
    expect((await f.call('GET', f.path())).body.isPublished).toBe(false);

    const republished = await f.call('PUT', f.path());
    expect(republished.body.isPublished).toBe(true);
  });

  it('decides each term on its own', async () => {
    const f = await setup();
    await f.call('PUT', f.path(0));
    expect((await f.call('GET', f.path(0))).body.isPublished).toBe(true);
    expect((await f.call('GET', f.path(1))).body.isPublished).toBe(false);

    await f.call('PUT', f.path(1));
    await f.call('DELETE', f.path(0));
    expect((await f.call('GET', f.path(0))).body.isPublished).toBe(false);
    expect((await f.call('GET', f.path(1))).body.isPublished).toBe(true);
  });

  it('publishes once when several requests publish the term at the same time', async () => {
    const f = await setup();
    const calls = await Promise.all(
      Array.from({ length: 8 }, () => f.call('PUT', f.path())),
    );
    expect(calls.map((c) => c.status)).toEqual(Array(8).fill(200));
    expect(calls[0].body.isPublished).toBe(true);
    for (const call of calls) expect(call.body).toEqual(calls[0].body);
  });

  it('places nobody into a room', async () => {
    const f = await setup();
    await createRegistration(prisma, {
      event: f.event,
      terms: [{ term: f.terms[0], status: 'confirmed' }],
    });
    await f.call('PUT', f.path());
    expect(
      await prisma.roomPlacement.count({ where: { eventId: f.event.id } }),
    ).toBe(0);
  });

  it('is not available to an organizer of another organization', async () => {
    const f = await setup();
    const stranger = await createOrganizer(prisma);
    await createOrganization(prisma, { ownerId: stranger.id });
    await f.call('PUT', f.path(1));

    expect((await f.call('GET', f.path(), stranger.id)).status).toBe(404);
    expect((await f.call('PUT', f.path(), stranger.id)).status).toBe(404);
    expect((await f.call('DELETE', f.path(1), stranger.id)).status).toBe(404);
    expect((await f.call('GET', f.path(0))).body.isPublished).toBe(false);
    expect((await f.call('GET', f.path(1))).body.isPublished).toBe(true);
  });

  it('is not found for a term of another event', async () => {
    const f = await setup();
    const other = await setup();
    const foreign = f.path().replace(f.terms[0].id, other.terms[0].id);
    expect((await f.call('PUT', foreign)).status).toBe(404);
    expect((await other.call('GET', other.path())).body.isPublished).toBe(
      false,
    );
  });
});
