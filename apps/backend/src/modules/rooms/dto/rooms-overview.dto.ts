import {
  RoomModel,
  RoomsOverviewModel,
  TermOccupancy,
} from '@/modules/rooms/domain/room';
import { ApiProperty } from '@nestjs/swagger';

export class RoomDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ description: 'Beds of the whole room in each term it is in.' })
  bedCount!: number;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Terms the room is available in; empty means in none.',
  })
  termIds!: string[];

  static from(model: RoomModel): RoomDto {
    return {
      id: model.id,
      label: model.label,
      bedCount: model.bedCount,
      termIds: model.termIds,
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

  @ApiProperty({
    description: 'Sum of beds of the rooms available in the term.',
  })
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
