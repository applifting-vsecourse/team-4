import {
  MAX_ROOMMATE_WISHES,
  Roommate,
  RoommateWishes,
} from '@/modules/registrations/domain/roommate-wish';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class RoommateDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty({ example: 'Anna Procházková' })
  name!: string;

  static from(roommate: Roommate): RoommateDto {
    return { registrationId: roommate.registrationId, name: roommate.name };
  }
}

export class RoommateWishesDto {
  @ApiProperty({
    type: [RoommateDto],
    description:
      'Other participants confirmed in at least one term of the event, by ' +
      'name; never the author.',
  })
  candidates!: RoommateDto[];

  @ApiProperty({
    type: [RoommateDto],
    description:
      'The stored wishes, by name; may name someone who is no longer a ' +
      'candidate.',
  })
  wishes!: RoommateDto[];

  static from(wishes: RoommateWishes): RoommateWishesDto {
    return {
      candidates: wishes.candidates.map((c) => RoommateDto.from(c)),
      wishes: wishes.wishes.map((w) => RoommateDto.from(w)),
    };
  }
}

export class SaveRoommateWishesDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'The whole list, replacing the stored one; an empty list removes ' +
      'every wish. Each a candidate or someone already wished for.',
  })
  @IsArray()
  @ArrayMaxSize(MAX_ROOMMATE_WISHES, {
    message: `Vyberte nejvýš ${MAX_ROOMMATE_WISHES} spolubydlících.`,
  })
  @IsUUID('all', { each: true, message: 'Neplatný účastník.' })
  registrationIds!: string[];
}

export class OrganizerRoommateWishesDto {
  @ApiProperty({ type: [RoommateDto], description: 'By name.' })
  wishes!: RoommateDto[];

  static from(wishes: Roommate[]): OrganizerRoommateWishesDto {
    return { wishes: wishes.map((w) => RoommateDto.from(w)) };
  }
}
