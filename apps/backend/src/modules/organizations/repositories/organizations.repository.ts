import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { OrganizationModel } from '@/modules/organizations/domain/organization';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByOwner(userId: string): Promise<OrganizationModel[]> {
    const rows = await this.prisma.organization.findMany({
      where: { ownerId: userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return rows.map((row) => new OrganizationModel(row.id, row.name));
  }

  async findByOwner(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationModel | null> {
    const row = await this.prisma.organization.findFirst({
      where: { id: organizationId, ownerId: userId },
      select: { id: true, name: true },
    });
    return row ? new OrganizationModel(row.id, row.name) : null;
  }

  /**
   * The organization and its owner membership are written together. Returns
   * `null` when the owner already has an organization of that name (unique
   * index on owner + lower-cased name), which also holds under concurrency.
   */
  async createWithOwner(
    name: string,
    ownerId: string,
  ): Promise<OrganizationModel | null> {
    try {
      const row = await this.prisma.organization.create({
        data: {
          name,
          ownerId,
          members: { create: { userId: ownerId, role: 'owner' } },
        },
        select: { id: true, name: true },
      });
      return new OrganizationModel(row.id, row.name);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }
}
