import { PrismaClient } from '@/generated/prisma/client';
import { termLayoutChanged } from '@/modules/accommodation/repositories/term-inputs';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
} from '@/testing/factories';
import { PrismaPg } from '@prisma/adapter-pg';

// The layout version of room proposals (#365, phase-2 spec §7.1) against a
// real database: a layout change bumps it and, with automatic proposals on,
// schedules one 10 s later; one the organizer asked for keeps its time. Needs
// a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

afterAll(() => prisma.$disconnect());

const setup = async (automatic: boolean): Promise<CreatedEvent> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [
      { startDate: '2027-07-01', endDate: '2027-07-07' },
      { startDate: '2027-08-01', endDate: '2027-08-07' },
    ],
  });
  await prisma.event.update({
    where: { id: created.event.id },
    data: { isRoomProposalAutomatic: automatic },
  });
  return created;
};

const changed = (f: CreatedEvent, termIds?: string[]): Promise<void> =>
  prisma.$transaction((tx) => termLayoutChanged(tx, f.event.id, termIds));

const stateOf = (f: CreatedEvent, index = 0) =>
  prisma.accommodationTermState.findUnique({
    where: { termId: f.terms[index]!.id },
  });

describe('the layout version', () => {
  it('goes up in the changed terms only, apart from the evaluation version', async () => {
    const f = await setup(false);

    await changed(f, [f.terms[0]!.id]);
    await changed(f, [f.terms[0]!.id]);

    expect(await stateOf(f)).toMatchObject({
      layoutVersion: 2,
      inputVersion: 0,
      proposalDueAt: null,
    });
    expect(await stateOf(f, 1)).toBeNull();
    await changed(f);
    expect((await stateOf(f, 1))?.layoutVersion).toBe(1);
  });

  it('schedules a proposal 10 s later only with automatic proposals on', async () => {
    const f = await setup(true);
    const before = Date.now();

    await changed(f, [f.terms[0]!.id]);

    const due = (await stateOf(f))!.proposalDueAt!.getTime();
    expect(due).toBeGreaterThanOrEqual(before + 9_000);
    expect(due).toBeLessThanOrEqual(Date.now() + 11_000);
  });

  it('keeps the time of a proposal the organizer asked for', async () => {
    const f = await setup(true);
    const asked = new Date(Date.now() - 5_000);
    await prisma.accommodationTermState.create({
      data: {
        termId: f.terms[0]!.id,
        eventId: f.event.id,
        proposalDueAt: asked,
        proposalRequestedById: 'organizer',
      },
    });

    await changed(f, [f.terms[0]!.id]);

    expect(await stateOf(f)).toMatchObject({
      layoutVersion: 1,
      proposalDueAt: asked,
      proposalRequestedById: 'organizer',
    });
  });
});
