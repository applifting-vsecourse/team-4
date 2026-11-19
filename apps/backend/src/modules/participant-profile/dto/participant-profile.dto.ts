import { ParticipantProfile } from '@/modules/participant-profile/domain/participant-profile';
import {
  PHONE_MESSAGE,
  toE164,
} from '@/modules/registrations/dto/registration-input.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Trimmed; an empty value is no value (null). */
const trimToNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Like `trimToNull`, then a valid international number in E.164. */
const phoneOrNull = ({ value }: { value: unknown }): unknown => {
  const trimmed = trimToNull({ value });
  return typeof trimmed === 'string' ? toE164({ value: trimmed }) : trimmed;
};

/**
 * The whole profile: a missing, `null` or empty field is stored as not
 * filled in, so an empty body clears it.
 */
export class UpdateParticipantProfileDto {
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    maxLength: 100,
    example: 'Anna',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: 'Zadejte jméno jako text.' })
  @MaxLength(100, { message: 'Jméno může mít nejvýše 100 znaků.' })
  firstName?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    maxLength: 100,
    example: 'Nováková',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: 'Zadejte příjmení jako text.' })
  @MaxLength(100, { message: 'Příjmení může mít nejvýše 100 znaků.' })
  lastName?: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: '+420 604 123 456',
    description:
      'With the international prefix, any country, spaces allowed. Stored in E.164.',
  })
  @Transform(phoneOrNull)
  @IsOptional()
  @IsString({ message: PHONE_MESSAGE })
  @Matches(/^\+[1-9]\d{6,14}$/, { message: PHONE_MESSAGE })
  phone?: string | null;
}

export class ParticipantProfileDto {
  @ApiProperty({
    example: 'anna.novakova@example.cz',
    description: 'The sign-in address of the account; not editable.',
  })
  email!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Anna' })
  firstName!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Nováková' })
  lastName!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '+420604123456',
    description: 'E.164.',
  })
  phone!: string | null;

  static fromModel(model: ParticipantProfile): ParticipantProfileDto {
    return { email: model.email, ...model.values };
  }
}
