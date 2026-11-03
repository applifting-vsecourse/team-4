import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Blank optional text is stored as nothing, not as an empty string. */
const blankToNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text === '' ? null : text;
};

/** Adding and editing a programme item use the same fields (F65). */
export class ProgrammeItemInputDto {
  @ApiProperty({ maxLength: 200, example: 'Společná večeře' })
  @Transform(trim)
  @IsString({ message: 'Vyplňte název položky.' })
  @IsNotEmpty({ message: 'Vyplňte název položky.' })
  @MaxLength(200, { message: 'Název může mít nejvýše 200 znaků.' })
  title!: string;

  @ApiProperty({
    example: '2026-11-06',
    description:
      'Calendar day within the term. Outside it: 400 `programme_date_out_of_term`.',
  })
  @IsString({ message: 'Vyberte datum.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Zadejte platné datum.' })
  startDate!: string;

  @ApiProperty({ example: '19:00', description: 'Europe/Prague, `HH:mm`.' })
  @IsString({ message: 'Zadejte čas začátku.' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Zadejte platný čas začátku.',
  })
  startTime!: string;

  @ApiPropertyOptional({ maxLength: 200, nullable: true, example: 'Jídelna' })
  @Transform(blankToNull)
  @IsOptional()
  @IsString({ message: 'Místo musí být text.' })
  @MaxLength(200, { message: 'Místo může mít nejvýše 200 znaků.' })
  place?: string | null;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @Transform(blankToNull)
  @IsOptional()
  @IsString({ message: 'Popis musí být text.' })
  @MaxLength(1000, { message: 'Popis může mít nejvýše 1000 znaků.' })
  description?: string | null;
}
