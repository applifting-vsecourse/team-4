import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Like the registration form: a valid international number becomes E.164. */
const toE164 = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return trimmed;
  const phone = parsePhoneNumberFromString(trimmed);
  return phone?.isValid() ? phone.number : trimmed;
};

const PHONE_MESSAGE =
  'Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456.';

type ContactFields = {
  contactEmail?: unknown;
  contactPhone?: unknown;
};

/** Description, conditions and public contact of the catalog detail (F55). */
export class PresentationInputDto {
  @ApiProperty({
    maxLength: 5000,
    description: 'Same validation rules as the event form.',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vyplňte popis.' })
  @MaxLength(5000, { message: 'Popis může mít nejvýše 5000 znaků.' })
  description!: string;

  @ApiProperty({
    maxLength: 2000,
    description: 'One condition per line; empty when there are none.',
  })
  @Transform(trim)
  @IsString()
  @MaxLength(2000, { message: 'Podmínky mohou mít nejvýše 2000 znaků.' })
  conditions!: string;

  @ApiProperty({
    maxLength: 200,
    description: 'Optional; shown when provided.',
  })
  @Transform(trim)
  @IsString()
  @MaxLength(200, { message: 'Jméno může mít nejvýše 200 znaků.' })
  contactName!: string;

  @ApiProperty({
    maxLength: 320,
    description: 'Optional; validated when provided.',
  })
  @Transform(trim)
  @IsString()
  @ValidateIf((input: ContactFields) => input.contactEmail !== '')
  @IsEmail({}, { message: 'Zadejte platný e-mail.' })
  @MaxLength(320, { message: 'E-mail může mít nejvýše 320 znaků.' })
  contactEmail!: string;

  @ApiProperty({
    example: '+420 604 123 456',
    description:
      'Optional; validated when provided, with an international prefix. Stored in E.164.',
  })
  @Transform(toE164)
  @IsString()
  @ValidateIf((input: ContactFields) => input.contactPhone !== '')
  @Matches(/^\+[1-9]\d{6,14}$/, { message: PHONE_MESSAGE })
  contactPhone!: string;
}
