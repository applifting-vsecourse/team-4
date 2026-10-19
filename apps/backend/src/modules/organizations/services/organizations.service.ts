import { OrganizationModel } from '@/modules/organizations/domain/organization';
import { OrganizationsRepository } from '@/modules/organizations/repositories/organizations.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class OrganizationsService {
  constructor(private readonly repository: OrganizationsRepository) {}

  list(userId: string): Promise<OrganizationModel[]> {
    return this.repository.findAllByMember(userId);
  }

  /** A missing and a foreign organization are indistinguishable (S2-03). */
  async get(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationModel> {
    const organization = await this.repository.findByMember(
      organizationId,
      userId,
    );
    if (!organization) throw new NotFoundException('Záznam není dostupný');
    return organization;
  }

  create(name: string, userId: string): Promise<OrganizationModel> {
    return this.repository.createWithOwner(name, userId);
  }
}
