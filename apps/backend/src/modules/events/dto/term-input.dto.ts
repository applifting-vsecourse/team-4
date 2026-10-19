import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 10 million CZK; keeps every sum of term prices inside a Postgres integer. */
export const MAX_PRICE_MINOR = 1_000_000_000;

/** Adding and editing a term use the same fields (S2-04). */
export class TermInputDto {
  @ApiProperty({ maxLength: 100, example: '1. turnus' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Vyplňte označení.' })
  @MaxLength(100, { message: 'Označení může mít nejvýše 100 znaků.' })
  label!: string;

  @ApiProperty({
    format: 'date',
    example: '2027-07-01',
    description: 'First day of the term, inclusive.',
  })
  @IsString({ message: 'Zadejte datum začátku.' })
  @Matches(CALENDAR_DATE, { message: 'Zadejte platné datum začátku.' })
  @IsISO8601({ strict: true }, { message: 'Zadejte platné datum začátku.' })
  startDate!: string;

  @ApiProperty({
    format: 'date',
    example: '2027-07-07',
    description: 'Last day of the term, inclusive. May equal startDate.',
  })
  @IsString({ message: 'Zadejte datum konce.' })
  @Matches(CALENDAR_DATE, { message: 'Zadejte platné datum konce.' })
  @IsISO8601({ strict: true }, { message: 'Zadejte platné datum konce.' })
  endDate!: string;

  @ApiProperty({
    minimum: 0,
    maximum: MAX_PRICE_MINOR,
    example: 790000,
    description: 'Price in haléře (CZK × 100). 0 is a free term.',
  })
  @IsDefined({ message: 'Zadejte cenu.' })
  @IsInt({ message: 'Cena musí být zadaná v celých haléřích.' })
  @Min(0, { message: 'Cena nesmí být záporná.' })
  @Max(MAX_PRICE_MINOR, { message: 'Cena může být nejvýše 10 000 000 Kč.' })
  priceMinor!: number;
}
