import {
  ParticipantTermPlacement,
  ParticipantWishState,
} from '@/modules/accommodation/domain/participant-placements';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const WISH_STATES: ParticipantWishState[] = [
  'satisfied',
  'unsatisfied',
  'unplaced',
];

export class ParticipantRoomDto {
  @ApiProperty()
  label!: string;
}

export class ParticipantWishDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    enum: WISH_STATES,
    description:
      'satisfied: the same room; unsatisfied: different rooms; unplaced: ' +
      'either person has no room yet.',
  })
  state!: ParticipantWishState;
}

export class ParticipantTermPlacementDto {
  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiProperty({
    description:
      'Whether the organizer published the rooms of the term; room and ' +
      'wishes are sent only when true.',
  })
  published!: boolean;

  @ApiPropertyOptional({
    type: ParticipantRoomDto,
    nullable: true,
    description: 'The own room; null while there is none.',
  })
  room?: ParticipantRoomDto | null;

  @ApiPropertyOptional({
    type: [ParticipantWishDto],
    description:
      'Own wishes for someone confirmed in this term too, by name; empty ' +
      'when none applies.',
  })
  wishes?: ParticipantWishDto[];

  static from(term: ParticipantTermPlacement): ParticipantTermPlacementDto {
    const base = {
      termId: term.termId,
      label: term.label,
      startDate: fromDate(term.startDate),
      endDate: fromDate(term.endDate),
    };
    if (!term.published) return { ...base, published: false };
    return {
      ...base,
      published: true,
      room: term.room ? { label: term.room.label } : null,
      wishes: term.wishes.map((wish) => ({
        registrationId: wish.registrationId,
        name: wish.name,
        state: wish.state,
      })),
    };
  }
}

export class ParticipantRoomPlacementsDto {
  @ApiProperty({
    type: [ParticipantTermPlacementDto],
    description: 'The confirmed terms of the registration, by start date.',
  })
  terms!: ParticipantTermPlacementDto[];

  static from(terms: ParticipantTermPlacement[]): ParticipantRoomPlacementsDto {
    return {
      terms: terms.map((term) => ParticipantTermPlacementDto.from(term)),
    };
  }
}
