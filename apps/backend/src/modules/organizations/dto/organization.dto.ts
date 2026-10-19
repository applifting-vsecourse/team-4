import { OrganizationModel } from '@/modules/organizations/domain/organization';
import { ApiProperty } from '@nestjs/swagger';

export class OrganizationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  static from(model: OrganizationModel): OrganizationDto {
    return { id: model.id, name: model.name };
  }
}
