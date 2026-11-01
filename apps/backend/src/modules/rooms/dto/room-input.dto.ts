import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Keeps the sum of beds of a term far inside a Postgres integer. */
export const MAX_BEDS = 1000;

/** Base beds, extra beds and availability of a room in one term (F11-1). */
export class RoomTermInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Neplatný termín.' })
  termId!: string;

  @ApiProperty({
    description: 'False keeps the beds saved but adds no places to the term.',
  })
  @IsBoolean({ message: 'Dostupnost musí být ano nebo ne.' })
  isAvailable!: boolean;

  @ApiProperty({ minimum: 0, maximum: MAX_BEDS, example: 4 })
  @IsDefined({ message: 'Zadejte počet základních lůžek.' })
  @IsInt({ message: 'Počet základních lůžek musí být celé číslo.' })
  @Min(0, { message: 'Počet základních lůžek nesmí být záporný.' })
  @Max(MAX_BEDS, {
    message: `Počet základních lůžek může být nejvýše ${MAX_BEDS}.`,
  })
  baseBeds!: number;

  @ApiProperty({ minimum: 0, maximum: MAX_BEDS, example: 1 })
  @IsDefined({ message: 'Zadejte počet přistýlek.' })
  @IsInt({ message: 'Počet přistýlek musí být celé číslo.' })
  @Min(0, { message: 'Počet přistýlek nesmí být záporný.' })
  @Max(MAX_BEDS, { message: `Počet přistýlek může být nejvýše ${MAX_BEDS}.` })
  extraBeds!: number;
}

/** Adding and editing a room use the same fields (S2-05, F11-1). */
export class RoomInputDto {
  @ApiProperty({
    maxLength: 100,
    example: 'Pokoj 1',
    description:
      'Trimmed. Unique within the event, ignoring case: 409 `room_label_taken`.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Vyplňte označení.' })
  @IsNotEmpty({ message: 'Vyplňte označení.' })
  @MaxLength(100, { message: 'Označení může mít nejvýše 100 znaků.' })
  label!: string;

  @ApiProperty({
    type: () => [RoomTermInputDto],
    description:
      'Settings for the terms of this event; a term left out is not set. ' +
      'A term of another event gives 400 `term_unknown`.',
  })
  @IsArray({ message: 'Nastavení termínů musí být seznam.' })
  @ArrayUnique((term: RoomTermInputDto) => term.termId, {
    message: 'Termín je uvedený víckrát.',
  })
  @IsObject({ each: true, message: 'Nastavení termínu musí být objekt.' })
  @ValidateNested({ each: true })
  @Type(() => RoomTermInputDto)
  terms!: RoomTermInputDto[];
}
