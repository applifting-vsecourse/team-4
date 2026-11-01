import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PublicationInputDto {
  @ApiProperty({ description: 'True lists the event in the public catalog.' })
  @IsBoolean()
  isPublished!: boolean;
}
