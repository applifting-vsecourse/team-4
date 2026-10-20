import {
  RoomModel,
  RoomsOverviewModel,
  TermCapacity,
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

export class TermCapacityDto {
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

  static from(model: TermCapacity): TermCapacityDto {
    return {
      id: model.id,
      label: model.label,
      startDate: model.startDate,
      endDate: model.endDate,
      capacity: model.capacity,
      confirmed: model.confirmed,
    };
  }
}

export class RoomsOverviewDto {
  @ApiProperty({ type: [RoomDto], description: 'In the order of creation.' })
  rooms!: RoomDto[];

  @ApiProperty({
    type: [TermCapacityDto],
    description: 'Every term of the event by start date, with its capacity.',
  })
  terms!: TermCapacityDto[];

  static from(model: RoomsOverviewModel): RoomsOverviewDto {
    return {
      rooms: model.rooms.map(RoomDto.from),
      terms: model.terms.map(TermCapacityDto.from),
    };
  }
}
