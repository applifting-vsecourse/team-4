import { OrganizationModel } from '@/modules/organizations/domain/organization';
import { OrganizationsRepository } from '@/modules/organizations/repositories/organizations.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const repository = {
    findAllByOwner: jest.fn(),
    findByOwner: jest.fn(),
    createWithOwner: jest.fn(),
  };
  const service = new OrganizationsService(
    repository as unknown as OrganizationsRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('lists organizations of the caller only', async () => {
    const own = [new OrganizationModel('a', 'Alfa')];
    repository.findAllByOwner.mockResolvedValue(own);
    await expect(service.list('user-1')).resolves.toBe(own);
    expect(repository.findAllByOwner).toHaveBeenCalledWith('user-1');
  });

  it('returns an own organization', async () => {
    const own = new OrganizationModel('a', 'Alfa');
    repository.findByOwner.mockResolvedValue(own);
    await expect(service.get('a', 'user-1')).resolves.toBe(own);
    expect(repository.findByOwner).toHaveBeenCalledWith('a', 'user-1');
  });

  it('hides a foreign or missing organization behind the same 404', async () => {
    repository.findByOwner.mockResolvedValue(null);
    await expect(service.get('x', 'user-1')).rejects.toEqual(
      new NotFoundException('Záznam není dostupný'),
    );
  });

  it('creates the organization owned by the caller with a trimmed name', async () => {
    const created = new OrganizationModel('b', 'Beta');
    repository.createWithOwner.mockResolvedValue(created);
    await expect(service.create('  Beta ', 'user-1')).resolves.toBe(created);
    expect(repository.createWithOwner).toHaveBeenCalledWith('Beta', 'user-1');
  });

  it('rejects a duplicate name with a conflict', async () => {
    repository.createWithOwner.mockResolvedValue(null);
    await expect(service.create('Beta', 'user-1')).rejects.toEqual(
      new ConflictException('Organizace s tímto názvem už existuje.'),
    );
  });
});
