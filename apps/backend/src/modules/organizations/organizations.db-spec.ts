import { PrismaService } from '@/core/prisma/prisma.service';
import { OrganizationsRepository } from '@/modules/organizations/repositories/organizations.repository';
import { OrganizationsService } from '@/modules/organizations/services/organizations.service';
import { createOrganizer } from '@/testing/factories';
import { ConflictException } from '@nestjs/common';

// Name uniqueness per owner against a real database (S2-02): the service maps
// the unique index violation, the index itself is the safety net under it.
// Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

const prisma = new PrismaService();
const service = new OrganizationsService(new OrganizationsRepository(prisma));

beforeAll(() => prisma.onModuleInit());
afterAll(() => prisma.onModuleDestroy());

describe('organization name uniqueness', () => {
  it('stores the trimmed name', async () => {
    const owner = await createOrganizer(prisma);
    const created = await service.create('  Tábor  ', owner.id);
    expect(created.name).toBe('Tábor');
  });

  it.each(['Tábor', 'tábor', 'TÁBOR', ' Tábor ', '\tTábor\n'])(
    'rejects the duplicate variant %j for the same owner',
    async (variant) => {
      const owner = await createOrganizer(prisma);
      await service.create('Tábor', owner.id);
      await expect(service.create(variant, owner.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(await service.list(owner.id)).toHaveLength(1);
    },
  );

  it('allows the same name for another owner', async () => {
    const [first, second] = [
      await createOrganizer(prisma),
      await createOrganizer(prisma),
    ];
    await service.create('Tábor', first.id);
    const other = await service.create('tábor', second.id);
    expect(other.name).toBe('tábor');
    expect(await service.list(second.id)).toHaveLength(1);
  });

  it('lets only one of many concurrent creates succeed', async () => {
    const owner = await createOrganizer(prisma);
    const names = ['Tábor', 'tábor', ' Tábor ', 'TÁBOR', 'Tábor', 'tábor'];
    const results = await Promise.allSettled(
      names.map((name) => service.create(name, owner.id)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const result of results) {
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(ConflictException);
      }
    }
    expect(await service.list(owner.id)).toHaveLength(1);
  });

  it('refuses an untrimmed or empty name in the database', async () => {
    const owner = await createOrganizer(prisma);
    for (const name of [' Tábor', '']) {
      await expect(
        prisma.organization.create({ data: { name, ownerId: owner.id } }),
      ).rejects.toThrow();
    }
  });
});
