import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * A valid international number becomes E.164 ("+420 777 123 456" →
 * "+420777123456"); anything else stays as typed and fails the E.164 check.
 * Without a leading "+" there is no country to read it in, so it is invalid.
 */
const toE164 = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return trimmed;
  const phone = parsePhoneNumberFromString(trimmed);
  return phone?.isValid() ? phone.number : trimmed;
};

const PHONE_MESSAGE =
  'Zadejte telefon s mezinárodní předvolbou, např. +420 777 123 456.';

/** The fixed form of an adult participant (S2-07). */
export class RegistrationInputDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Generated when the form opens and sent with every retry. The same key ' +
      'and content return the saved result (200); the same key with other ' +
      'content gives 409 `submission_key_reused`.',
  })
  @IsUUID('all', { message: 'Neplatný identifikátor odeslání.' })
  submissionKey!: string;

  @ApiProperty({ maxLength: 100, example: 'Jana' })
  @Transform(trim)
  @IsString({ message: 'Vyplňte jméno.' })
  @IsNotEmpty({ message: 'Vyplňte jméno.' })
  @MaxLength(100, { message: 'Jméno může mít nejvýše 100 znaků.' })
  firstName!: string;

  @ApiProperty({ maxLength: 100, example: 'Nováková' })
  @Transform(trim)
  @IsString({ message: 'Vyplňte příjmení.' })
  @IsNotEmpty({ message: 'Vyplňte příjmení.' })
  @MaxLength(100, { message: 'Příjmení může mít nejvýše 100 znaků.' })
  lastName!: string;

  @ApiProperty({
    maxLength: 320,
    example: 'jana@example.com',
    description:
      'Trimmed. One registration per e-mail and event, ignoring case: 409 ' +
      '`already_registered`, without any data of the existing registration.',
  })
  @Transform(trim)
  @IsEmail({}, { message: 'Zadejte platný e-mail.' })
  @MaxLength(320, { message: 'E-mail může mít nejvýše 320 znaků.' })
  email!: string;

  @ApiProperty({
    example: '+420 777 123 456',
    description:
      'With the international prefix, any country, spaces allowed. Stored in E.164.',
  })
  @Transform(toE164)
  @IsString({ message: PHONE_MESSAGE })
  @Matches(/^\+[1-9]\d{6,14}$/, { message: PHONE_MESSAGE })
  phone!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'At least one term of this event. A term of another event gives 400 `term_unknown`.',
  })
  @IsArray({ message: 'Vyberte alespoň jeden termín.' })
  @ArrayNotEmpty({ message: 'Vyberte alespoň jeden termín.' })
  @ArrayMaxSize(100, { message: 'Vyberte nejvýše 100 termínů.' })
  @ArrayUnique({ message: 'Termín je vybraný víckrát.' })
  @IsUUID('all', { each: true, message: 'Neplatný termín.' })
  termIds!: string[];
}
