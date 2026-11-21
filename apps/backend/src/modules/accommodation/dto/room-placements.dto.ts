import {
  ConfirmableWarning,
  PlacementWarning,
  SavedWishState,
} from '@/modules/accommodation/domain/room-placement';
import {
  AppliedProposal,
  Occupant,
  PlacementPerson,
  PlacementRoom,
  TermPlacements,
  TermWish,
} from '@/modules/accommodation/repositories/room-placements.repository';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';

const WARNINGS: PlacementWarning[] = [
  'mixed',
  'extra_bed',
  'over_capacity',
  'room_unavailable',
];
const CONFIRMABLE: ConfirmableWarning[] = [
  'mixed',
  'extra_bed',
  'over_capacity',
];

export class PlaceInRoomDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'A room of the event, available in the term; else 404, or 409 ' +
      '`room_unavailable`.',
  })
  @IsUUID('all', { message: 'Vyberte pokoj.' })
  roomId!: string;

  @ApiPropertyOptional({
    enum: CONFIRMABLE,
    isArray: true,
    description:
      'The warnings the organizer confirms as an exception, as a 409 ' +
      '`placement_warnings` listed them. The placement is saved only when ' +
      'they cover every warning of the room after it; else 409 ' +
      '`placement_warnings` with the current `warnings`, and nothing is saved.',
  })
  @IsOptional()
  @IsArray({ message: 'Potvrďte, nebo zrušte výjimku.' })
  @ArrayMaxSize(CONFIRMABLE.length, {
    message: 'Potvrďte, nebo zrušte výjimku.',
  })
  @IsIn(CONFIRMABLE, { each: true, message: 'Potvrďte, nebo zrušte výjimku.' })
  confirmWarnings?: ConfirmableWarning[];

  @ApiPropertyOptional({
    description:
      'Locks (true) or unlocks (false) the placement as it is saved; unset ' +
      'leaves a new placement unlocked and keeps the lock of the current one.',
  })
  @IsOptional()
  @IsBoolean({ message: 'Zvolte, zda umístění zamknout.' })
  lock?: boolean;
}

export class LockPlacementDto {
  @ApiProperty()
  @IsBoolean({ message: 'Zvolte, zda umístění zamknout.' })
  isLocked!: boolean;
}

export class PlacementPersonDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The effective value of the hard attribute; null without one, or ' +
      'when the event has no hard attribute.',
  })
  value!: string | null;

  static from(person: PlacementPerson): PlacementPersonDto {
    return {
      registrationId: person.registrationId,
      name: person.name,
      value: person.value,
    };
  }
}

export class OccupantDto extends PlacementPersonDto {
  @ApiProperty({
    description: 'The room proposal keeps it; manual moves wait for unlocking.',
  })
  isLocked!: boolean;

  @ApiProperty({
    enum: CONFIRMABLE,
    isArray: true,
    description: 'The warnings the organizer confirmed when placing them.',
  })
  confirmedWarnings!: ConfirmableWarning[];

  static from(occupant: Occupant): OccupantDto {
    return {
      ...PlacementPersonDto.from(occupant),
      isLocked: occupant.isLocked,
      confirmedWarnings: occupant.confirmedWarnings,
    };
  }
}

export class PlacementRoomDto {
  @ApiProperty({ format: 'uuid' })
  roomId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ description: 'False also for a room without term settings.' })
  isAvailable!: boolean;

  @ApiProperty()
  baseBeds!: number;

  @ApiProperty()
  extraBeds!: number;

  @ApiProperty({ type: [OccupantDto], description: 'By name.' })
  occupants!: OccupantDto[];

  @ApiProperty({
    enum: WARNINGS,
    isArray: true,
    description:
      '`mixed`: different values of the hard attribute; `extra_bed`: more ' +
      'people than base beds; `over_capacity`: more than all beds; ' +
      '`room_unavailable`: people in a room unavailable in the term.',
  })
  warnings!: PlacementWarning[];

  static from(room: PlacementRoom): PlacementRoomDto {
    return {
      roomId: room.roomId,
      label: room.label,
      isAvailable: room.isAvailable,
      baseBeds: room.baseBeds,
      extraBeds: room.extraBeds,
      occupants: room.occupants.map((o) => OccupantDto.from(o)),
      warnings: room.warnings,
    };
  }
}

export class TermPlacementsDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The event’s hard attribute; null when none splits rooms.',
  })
  hardAttribute!: string | null;

  @ApiProperty({ type: [PlacementRoomDto], description: 'By label.' })
  rooms!: PlacementRoomDto[];

  @ApiProperty({
    type: [PlacementPersonDto],
    description: 'Confirmed participants of the term without a room, by name.',
  })
  unplaced!: PlacementPersonDto[];

  static from(placements: TermPlacements): TermPlacementsDto {
    return {
      hardAttribute: placements.hardAttribute,
      rooms: placements.rooms.map((room) => PlacementRoomDto.from(room)),
      unplaced: placements.unplaced.map((p) => PlacementPersonDto.from(p)),
    };
  }
}

export class ApplyProposalDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'The proposal the organizer reviewed; 409 `proposal_stale` unless it ' +
      'is the term’s current solved proposal.',
  })
  @IsUUID('all', { message: 'Načtěte návrh pokojů znovu.' })
  proposalId!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'One per attempt: the same key answers with the first result and ' +
      'saves nothing again.',
  })
  @IsUUID('all', { message: 'Zkuste návrh použít znovu.' })
  submissionKey!: string;
}

export class AppliedProposalDto {
  @ApiProperty({ description: 'People who got a room they had none of.' })
  added!: number;

  @ApiProperty({ description: 'People moved to another room.' })
  moved!: number;

  @ApiProperty({ description: 'People who lost their room.' })
  removed!: number;

  @ApiProperty({
    description: 'The term’s layout version after the apply.',
  })
  layoutVersion!: number;

  static from(applied: AppliedProposal): AppliedProposalDto {
    return { ...applied };
  }
}

const WISH_STATES: SavedWishState[] = [
  'satisfied',
  'unsatisfied',
  'unplaced',
  'impossible',
];

export class WishPersonDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  name!: string;
}

export class TermWishDto {
  @ApiProperty({ type: WishPersonDto })
  from!: WishPersonDto;

  @ApiProperty({ type: WishPersonDto })
  to!: WishPersonDto;

  @ApiProperty({
    enum: WISH_STATES,
    description:
      'In the saved placements now: the same room wins, then different ' +
      'values of the hard attribute, then someone without a room.',
  })
  saved!: SavedWishState;
}

export class TermWishesDto {
  @ApiProperty({
    type: [TermWishDto],
    description:
      'Wishes between two participants confirmed in the term, by the ' +
      'names of both.',
  })
  wishes!: TermWishDto[];

  static from(wishes: TermWish[]): TermWishesDto {
    return { wishes: wishes.map((wish) => ({ ...wish })) };
  }
}
