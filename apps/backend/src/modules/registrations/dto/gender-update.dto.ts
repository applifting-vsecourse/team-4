import {
  Gender,
  GENDER_OTHER_MAX_LENGTH,
  GENDERS,
} from '@/modules/registrations/domain/gender';
import {
  GENDER_MESSAGE,
  GenderOther,
} from '@/modules/registrations/dto/registration-input.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** The organizer's correction of the participant's answer (F64). */
export class GenderUpdateDto {
  @ApiProperty({
    enum: GENDERS,
    nullable: true,
    description:
      'Required; one value, or null for "not answered". Never an inferred one.',
  })
  @IsIn([...GENDERS, null], { message: GENDER_MESSAGE })
  gender!: Gender | null;

  @ApiPropertyOptional({
    type: String,
    maxLength: GENDER_OTHER_MAX_LENGTH,
    nullable: true,
    description:
      'The own words for `gender: other`, and only with it (else 400). ' +
      'Left out or null is none; trimmed, empty is null.',
  })
  @GenderOther()
  genderOther?: string | null;
}
