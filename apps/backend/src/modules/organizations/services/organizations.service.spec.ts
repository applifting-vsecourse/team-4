import { OrganizationModel } from '@/modules/organizations/domain/organization';
import { OrganizationsRepository } from '@/modules/organizations/repositories/organizations.repository';
import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const repository = {
    findAllByMember: jest.fn(),
    findByMember: jest.fn(),
    createWithOwner: jest.fn(),
  };
  const service = new OrganizationsService(
    repository as unknown as OrganizationsRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('lists organizations of the caller only', async () => {
    const own = [new OrganizationModel('a', 'Alfa')];
    repository.findAllByMember.mockResolvedValue(own);
    await expect(service.list('user-1')).resolves.toBe(own);
    expect(repository.findAllByMember).toHaveBeenCalledWith('user-1');
  });

  it('returns an own organization', async () => {
    const own = new OrganizationModel('a', 'Alfa');
    repository.findByMember.mockResolvedValue(own);
    await expect(service.get('a', 'user-1')).resolves.toBe(own);
    expect(repository.findByMember).toHaveBeenCalledWith('a', 'user-1');
  });

  it('hides a foreign or missing organization behind the same 404', async () => {
    repository.findByMember.mockResolvedValue(null);
    await expect(service.get('x', 'user-1')).rejects.toEqual(
      new NotFoundException('Záznam není dostupný'),
    );
  });

  it('creates the organization owned by the caller', async () => {
    const created = new OrganizationModel('b', 'Beta');
    repository.createWithOwner.mockResolvedValue(created);
    await expect(service.create('Beta', 'user-1')).resolves.toBe(created);
    expect(repository.createWithOwner).toHaveBeenCalledWith('Beta', 'user-1');
  });
});
