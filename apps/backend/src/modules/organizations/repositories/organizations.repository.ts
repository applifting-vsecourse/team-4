import { PrismaService } from '@/core/prisma/prisma.service';
import { OrganizationModel } from '@/modules/organizations/domain/organization';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByMember(userId: string): Promise<OrganizationModel[]> {
    const rows = await this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return rows.map((row) => new OrganizationModel(row.id, row.name));
  }

  async findByMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationModel | null> {
    const row = await this.prisma.organization.findFirst({
      where: { id: organizationId, members: { some: { userId } } },
      select: { id: true, name: true },
    });
    return row ? new OrganizationModel(row.id, row.name) : null;
  }

  /** The organization and its owner membership are written together. */
  async createWithOwner(
    name: string,
    ownerId: string,
  ): Promise<OrganizationModel> {
    const row = await this.prisma.organization.create({
      data: { name, members: { create: { userId: ownerId, role: 'owner' } } },
      select: { id: true, name: true },
    });
    return new OrganizationModel(row.id, row.name);
  }
}
