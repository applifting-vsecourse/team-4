import {
  RoomModel,
  RoomsOverviewModel,
  TermOccupancy,
} from '@/modules/rooms/domain/room';
import { ApiProperty } from '@nestjs/swagger';

export class RoomTermDto {
  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  baseBeds!: number;

  @ApiProperty()
  extraBeds!: number;
}

export class RoomDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({
    type: () => [RoomTermDto],
    description: 'Settings in the terms the room has any; others are not set.',
  })
  terms!: RoomTermDto[];

  static from(model: RoomModel): RoomDto {
    return {
      id: model.id,
      label: model.label,
      terms: model.terms.map((term) => ({
        termId: term.termId,
        isAvailable: term.isAvailable,
        baseBeds: term.baseBeds,
        extraBeds: term.extraBeds,
      })),
    };
  }
}

export class TermOccupancyDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiProperty({ description: 'Base beds of the rooms available in the term.' })
  baseBeds!: number;

  @ApiProperty({
    description: 'Extra beds of the rooms available in the term.',
  })
  extraBeds!: number;

  @ApiProperty({ description: 'Base beds plus extra beds.' })
  capacity!: number;

  @ApiProperty({ description: 'Participants confirmed in the term.' })
  confirmed!: number;

  @ApiProperty({
    description: 'Capacity minus confirmed participants, never below zero.',
  })
  free!: number;

  @ApiProperty({
    description: 'Participants waiting in the term; they hold no bed.',
  })
  waitlisted!: number;

  static from(model: TermOccupancy): TermOccupancyDto {
    return {
      id: model.id,
      label: model.label,
      startDate: model.startDate,
      endDate: model.endDate,
      baseBeds: model.baseBeds,
      extraBeds: model.extraBeds,
      capacity: model.capacity,
      confirmed: model.confirmed,
      free: model.free,
      waitlisted: model.waitlisted,
    };
  }
}

export class RoomsOverviewDto {
  @ApiProperty({ type: [RoomDto], description: 'In the order of creation.' })
  rooms!: RoomDto[];

  @ApiProperty({
    type: [TermOccupancyDto],
    description:
      'Every term of the event by start date, with its capacity and occupancy.',
  })
  terms!: TermOccupancyDto[];

  static from(model: RoomsOverviewModel): RoomsOverviewDto {
    return {
      rooms: model.rooms.map(RoomDto.from),
      terms: model.terms.map(TermOccupancyDto.from),
    };
  }
}
