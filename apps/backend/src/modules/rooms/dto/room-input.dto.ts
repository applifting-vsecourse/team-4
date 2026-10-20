import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Keeps the sum of beds of a term far inside a Postgres integer. */
export const MAX_BEDS = 1000;

/** Adding and editing a room use the same fields (S2-05). */
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

  @ApiProperty({ minimum: 1, maximum: MAX_BEDS, example: 4 })
  @IsDefined({ message: 'Zadejte počet lůžek.' })
  @IsInt({ message: 'Počet lůžek musí být celé číslo.' })
  @Min(1, { message: 'Počet lůžek musí být alespoň 1.' })
  @Max(MAX_BEDS, { message: `Počet lůžek může být nejvýše ${MAX_BEDS}.` })
  bedCount!: number;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'Terms of this event the whole room is available in; may be empty. ' +
      'A term of another event gives 400 `term_unknown`.',
  })
  @IsArray({ message: 'Dostupnost musí být seznam termínů.' })
  @ArrayUnique({ message: 'Termín je vybraný víckrát.' })
  @IsUUID('all', { each: true, message: 'Neplatný termín.' })
  termIds!: string[];
}
