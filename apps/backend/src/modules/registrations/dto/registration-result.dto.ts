import {
  ParticipationStatus,
  RegistrationResultModel,
  RegistrationTermResult,
} from '@/modules/registrations/domain/registration';
import { ApiProperty } from '@nestjs/swagger';

const STATUSES: ParticipationStatus[] = ['confirmed', 'waitlisted'];

export class RegistrationTermResultDto {
  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiProperty({ description: 'Price of the term at receipt, in haléře.' })
  priceMinor!: number;

  @ApiProperty({
    enum: STATUSES,
    description:
      '`confirmed` holds a bed in this term; `waitlisted` holds none and creates no payment obligation.',
  })
  status!: ParticipationStatus;

  static from(model: RegistrationTermResult): RegistrationTermResultDto {
    return {
      termId: model.termId,
      label: model.label,
      startDate: model.startDate,
      endDate: model.endDate,
      priceMinor: model.priceMinor,
      status: model.status,
    };
  }
}

/** What the submitter sees right after saving (S2-14); nothing of other registrations. */
export class RegistrationResultDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time', description: 'Server time of receipt.' })
  receivedAt!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ description: 'As submitted, trimmed.' })
  email!: string;

  @ApiProperty({ description: 'E.164.' })
  phone!: string;

  @ApiProperty({
    type: [RegistrationTermResultDto],
    description: 'Every selected term by start date, each with its own status.',
  })
  terms!: RegistrationTermResultDto[];

  @ApiProperty({
    description:
      'Sum of the selected terms in haléře. Not the amount due: waitlisted terms are included.',
  })
  selectedPriceMinor!: number;

  static from(model: RegistrationResultModel): RegistrationResultDto {
    return {
      id: model.id,
      receivedAt: model.receivedAt.toISOString(),
      firstName: model.firstName,
      lastName: model.lastName,
      email: model.email,
      phone: model.phone,
      terms: model.terms.map(RegistrationTermResultDto.from),
      selectedPriceMinor: model.selectedPriceMinor,
    };
  }
}
