import { Gender, GENDERS } from '@/modules/registrations/domain/gender';
import { GENDER_MESSAGE } from '@/modules/registrations/dto/registration-input.dto';
import { ApiProperty } from '@nestjs/swagger';
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
}
