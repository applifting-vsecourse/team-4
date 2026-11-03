import { ProgrammeItemModel } from '@/modules/programme/domain/programme-item';
import { ApiProperty } from '@nestjs/swagger';

export class ProgrammeItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ example: '2026-11-06', description: 'Calendar day.' })
  startDate!: string;

  @ApiProperty({ example: '19:00', description: 'Europe/Prague, `HH:mm`.' })
  startTime!: string;

  @ApiProperty({ nullable: true, type: String })
  place!: string | null;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  static from(model: ProgrammeItemModel): ProgrammeItemDto {
    return { ...model };
  }
}

export class ProgrammeDto {
  @ApiProperty({
    type: [ProgrammeItemDto],
    description: 'Chronological: by day, start time, then creation.',
  })
  items!: ProgrammeItemDto[];

  static from(models: ProgrammeItemModel[]): ProgrammeDto {
    return { items: models.map(ProgrammeItemDto.from) };
  }
}
