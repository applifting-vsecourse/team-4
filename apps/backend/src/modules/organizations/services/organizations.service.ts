import { OrganizationModel } from '@/modules/organizations/domain/organization';
import { OrganizationsRepository } from '@/modules/organizations/repositories/organizations.repository';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class OrganizationsService {
  constructor(private readonly repository: OrganizationsRepository) {}

  list(userId: string): Promise<OrganizationModel[]> {
    return this.repository.findAllByOwner(userId);
  }

  /** A missing and a foreign organization are indistinguishable (S2-03). */
  async get(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationModel> {
    const organization = await this.repository.findByOwner(
      organizationId,
      userId,
    );
    if (!organization) throw new NotFoundException('Záznam není dostupný');
    return organization;
  }

  /** `name` is trimmed here too, so callers other than the DTO cannot skip it. */
  async create(name: string, userId: string): Promise<OrganizationModel> {
    const created = await this.repository.createWithOwner(name.trim(), userId);
    if (!created) {
      throw new ConflictException('Organizace s tímto názvem už existuje.');
    }
    return created;
  }
}
