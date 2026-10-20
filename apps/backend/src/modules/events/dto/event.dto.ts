import {
  EventDetailModel,
  EventStatus,
  EventSummaryModel,
  EventTermModel,
} from '@/modules/events/domain/event';
import { ApiProperty } from '@nestjs/swagger';

const STATUSES: EventStatus[] = ['draft', 'open', 'closed'];

export class EventTermDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date', example: '2027-07-01' })
  startDate!: string;

  @ApiProperty({ format: 'date', example: '2027-07-07' })
  endDate!: string;

  @ApiProperty({ description: 'Price in haléře (CZK × 100).' })
  priceMinor!: number;

  @ApiProperty({
    description: 'Beds of the rooms available in the term; 0 without rooms.',
  })
  capacity!: number;

  static from(model: EventTermModel): EventTermDto {
    return {
      id: model.id,
      label: model.label,
      startDate: model.startDate,
      endDate: model.endDate,
      priceMinor: model.priceMinor,
      capacity: model.capacity,
    };
  }
}

export class EventPeriodDto {
  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;
}

export class EventSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({ enum: STATUSES })
  status!: EventStatus;

  @ApiProperty()
  termCount!: number;

  @ApiProperty({
    type: EventPeriodDto,
    nullable: true,
    description: 'First start and last end over all terms.',
  })
  period!: EventPeriodDto | null;

  static from(model: EventSummaryModel): EventSummaryDto {
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      location: model.location,
      status: model.status,
      termCount: model.termCount,
      period: model.period
        ? { startDate: model.period.startDate, endDate: model.period.endDate }
        : null,
    };
  }
}

export class EventDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({ enum: STATUSES })
  status!: EventStatus;

  @ApiProperty({
    description:
      'True from the first opening of registration on, even after closing. ' +
      'Name, description, location and terms cannot change then.',
  })
  isLocked!: boolean;

  @ApiProperty({ type: [EventTermDto], description: 'Sorted by start date.' })
  terms!: EventTermDto[];

  static from(model: EventDetailModel): EventDetailDto {
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      location: model.location,
      status: model.status,
      isLocked: model.isLocked,
      terms: model.terms.map(EventTermDto.from),
    };
  }
}
