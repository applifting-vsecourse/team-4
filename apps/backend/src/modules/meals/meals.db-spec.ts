import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { MealsController } from '@/modules/meals/controllers/meals.controller';
import { MealsRepository } from '@/modules/meals/repositories/meals.repository';
import { MealsService } from '@/modules/meals/services/meals.service';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// S5-04 through the HTTP API against a real database. Only the BetterAuth
// session is replaced: the `x-test-user` header names the caller.
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

// Response bodies are asserted field by field; typing every DTO here adds nothing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [MealsController],
    providers: [MealsService, MealsRepository],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

const get = async (
  userId: string,
  organizationId: string,
  eventId: string,
  termId: string,
): Promise<Call> => {
  const response = await fetch(
    `${baseUrl}/organizations/${organizationId}/events/${eventId}/meals/${termId}`,
    { headers: { 'x-test-user': userId } },
  );
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

type Fixture = Awaited<ReturnType<typeof createEvent>> & {
  owner: Awaited<ReturnType<typeof createOrganizer>>;
  organization: Awaited<ReturnType<typeof createOrganization>>;
};

const fixture = async (): Promise<Fixture> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: 'open',
    terms: [
      { startDate: '2027-07-01', endDate: '2027-07-03', label: 'T1' },
      { startDate: '2027-07-15', endDate: '2027-07-16', label: 'T2' },
    ],
  });
  return { owner, organization, ...created };
};

describe('S5-04 meal overview', () => {
  it('counts only confirmed participants, once per day and category', async () => {
    const f = await fixture();
    const [t1, t2] = f.terms;
    const basic = await createRegistration(prisma, {
      event: f.event,
      terms: [{ term: t1, status: 'confirmed' }],
    });
    const combined = await createRegistration(prisma, {
      event: f.event,
      terms: [{ term: t1, status: 'confirmed' }],
    });
    const noRestriction = await createRegistration(prisma, {
      event: f.event,
      terms: [{ term: t1, status: 'confirmed' }],
    });
    const others = await Promise.all(
      (['pending', 'waitlisted', 'cancelled'] as const).map((status) =>
        createRegistration(prisma, {
          event: f.event,
          terms: [{ term: t1, status }],
        }),
      ),
    );
    await createRegistration(prisma, {
      event: f.event,
      terms: [{ term: t2, status: 'confirmed' }],
    });
    await prisma.registration.update({
      where: { id: combined.id },
      data: { diet: ['vegetarian', 'lactose_free'], dietNote: 'Bez ořechů' },
    });
    await prisma.registration.update({
      where: { id: noRestriction.id },
      data: { hasNoDietRestriction: true },
    });
    await prisma.registration.updateMany({
      where: { id: { in: others.map((r) => r.id) } },
      data: { diet: ['vegan'], dietNote: 'Nezapočítat' },
    });

    const { status, body } = await get(
      f.owner.id,
      f.organization.id,
      f.event.id,
      t1.id,
    );

    expect(status).toBe(200);
    expect(body.participants).toBe(3);
    expect(body.days.map((day: { date: string }) => day.date)).toEqual([
      '2027-07-01',
      '2027-07-02',
      '2027-07-03',
    ]);
    for (const day of body.days) {
      expect(day.total).toBe(3);
      expect(day.categories).toEqual([
        { diets: [], count: 2 },
        { diets: ['vegetarian', 'lactose_free'], count: 1 },
      ]);
    }
    expect(body.notes).toEqual([
      expect.objectContaining({
        registrationId: combined.id,
        note: 'Bez ořechů',
      }),
    ]);
    expect(basic.id).toBeDefined();
  });

  it('is empty for a term without confirmed participants', async () => {
    const f = await fixture();
    const { status, body } = await get(
      f.owner.id,
      f.organization.id,
      f.event.id,
      f.terms[1].id,
    );
    expect(status).toBe(200);
    expect(body.participants).toBe(0);
    expect(body.days).toHaveLength(2);
    expect(body.days[0].categories).toEqual([]);
  });

  it('looks the same for a foreign organizer and an unknown term', async () => {
    const f = await fixture();
    const stranger = await createOrganizer(prisma);
    const foreign = await get(
      stranger.id,
      f.organization.id,
      f.event.id,
      f.terms[0].id,
    );
    const unknown = await get(
      f.owner.id,
      f.organization.id,
      f.event.id,
      '019a0000-0000-7000-8000-000000000000',
    );
    expect(foreign.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(foreign.body).toEqual(unknown.body);
  });
});
