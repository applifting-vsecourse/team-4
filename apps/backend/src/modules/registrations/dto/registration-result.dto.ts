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

export class BankAccountDto {
  @ApiProperty({ nullable: true, type: String })
  prefix!: string | null;

  @ApiProperty()
  number!: string;

  @ApiProperty({ description: 'Four-digit bank code.' })
  bankCode!: string;
}

export class PaymentInstructionsDto {
  @ApiProperty({
    description: 'Amount due in haléře (CZK), confirmed terms only.',
  })
  amountMinor!: number;

  @ApiProperty({
    description: 'Globally unique variable symbol of the registration.',
  })
  variableSymbol!: string;

  @ApiProperty({ type: BankAccountDto })
  account!: BankAccountDto;

  @ApiProperty({
    format: 'date-time',
    description:
      'Payment reminder date, not a deadline: passing it changes nothing about the registration, and no e-mail is promised.',
  })
  reminderAt!: string;
}

export class EventSummaryDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  location!: string;
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

  @ApiProperty({ type: EventSummaryDto })
  event!: EventSummaryDto;

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

  @ApiProperty({
    description:
      'Sum of the confirmed terms in haléře; 0 when all are waitlisted or free.',
  })
  amountDueMinor!: number;

  @ApiProperty({
    type: PaymentInstructionsDto,
    nullable: true,
    description:
      'Null at zero obligation: no reminder date and no request to pay.',
  })
  paymentInstructions!: PaymentInstructionsDto | null;

  static from(model: RegistrationResultModel): RegistrationResultDto {
    const instructions = model.paymentInstructions;
    return {
      id: model.id,
      receivedAt: model.receivedAt.toISOString(),
      event: { ...model.event },
      firstName: model.firstName,
      lastName: model.lastName,
      email: model.email,
      phone: model.phone,
      terms: model.terms.map(RegistrationTermResultDto.from),
      selectedPriceMinor: model.selectedPriceMinor,
      amountDueMinor: model.amountDueMinor,
      paymentInstructions: instructions && {
        amountMinor: instructions.amountMinor,
        variableSymbol: instructions.variableSymbol,
        account: { ...instructions.account },
        reminderAt: instructions.reminderAt.toISOString(),
      },
    };
  }
}
