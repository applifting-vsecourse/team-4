import { Gender, GENDERS } from '@/modules/registrations/domain/gender';
import {
  PAYMENT_STATES,
  PaymentState,
} from '@/modules/registrations/domain/managed-registration';
import { ParticipantRegistrationModel } from '@/modules/registrations/domain/participant-registration';
import { EventTermInfo } from '@/modules/registrations/domain/registration-change';
import { ReceivedPaymentDto } from '@/modules/registrations/dto/managed-registration.dto';
import {
  EventSummaryDto,
  PaymentInstructionsDto,
  RegistrationTermResultDto,
} from '@/modules/registrations/dto/registration-result.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ParticipantContactDto {
  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ description: 'The sign-in identity; it cannot be changed.' })
  email!: string;

  @ApiProperty({ description: 'E.164.' })
  phone!: string;

  @ApiProperty({
    enum: GENDERS,
    nullable: true,
    description: 'Voluntary answer for accommodation; null when not answered.',
  })
  gender!: Gender | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The own words for `gender: other`; null when none.',
  })
  genderOther!: string | null;
}

export class AvailableTermDto {
  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiProperty({ description: 'Current price in haléře.' })
  priceMinor!: number;

  @ApiProperty({
    description: 'No bed is free: moving there means the waitlist.',
  })
  isFull!: boolean;
}

export class ParticipantRegistrationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time', description: 'Server time of receipt.' })
  receivedAt!: string;

  @ApiProperty({ type: EventSummaryDto })
  event!: EventSummaryDto;

  @ApiProperty({
    type: [RegistrationTermResultDto],
    description: 'Every selected term by start, each with its own status.',
  })
  terms!: RegistrationTermResultDto[];

  @ApiProperty({
    description: 'Σ selected terms in haléře, waitlisted included.',
  })
  selectedPriceMinor!: number;

  @ApiProperty({ description: 'Σ confirmed terms in haléře.' })
  amountDueMinor!: number;

  @ApiProperty({ description: 'Σ received payments in haléře.' })
  paidMinor!: number;

  @ApiProperty({
    description: 'Due − paid: positive a debt, 0 settled, negative overpaid.',
  })
  balanceMinor!: number;

  @ApiProperty({ enum: PAYMENT_STATES })
  paymentState!: PaymentState;

  @ApiProperty({
    type: PaymentInstructionsDto,
    nullable: true,
    description:
      'Only while a debt remains: the remaining amount, account, variable ' +
      'symbol and the payment reminder date (not a deadline). Null otherwise.',
  })
  paymentInstructions!: PaymentInstructionsDto | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Token of the QR payment link (`/platba/{token}`), only while a debt ' +
      'remains; null otherwise.',
  })
  paymentLinkToken!: string | null;

  @ApiProperty({
    type: [ReceivedPaymentDto],
    description: 'By the day received, oldest first.',
  })
  payments!: ReceivedPaymentDto[];

  @ApiProperty({ type: ParticipantContactDto })
  contact!: ParticipantContactDto;

  @ApiProperty({
    description:
      'Send back as `expectedVersion` when changing the registration.',
  })
  version!: number;

  @ApiProperty({ description: 'Every term released (F35-2a).' })
  isCancelled!: boolean;

  @ApiProperty({
    description:
      'Editing and cancelling are offered: not cancelled, no request waiting.',
  })
  canChange!: boolean;

  static from(model: ParticipantRegistrationModel): ParticipantRegistrationDto {
    const instructions = model.paymentInstructions;
    return {
      id: model.id,
      receivedAt: model.receivedAt.toISOString(),
      event: { ...model.event },
      terms: model.terms.map(RegistrationTermResultDto.from),
      selectedPriceMinor: model.selectedPriceMinor,
      amountDueMinor: model.amountDueMinor,
      paidMinor: model.paidMinor,
      balanceMinor: model.balanceMinor,
      paymentState: model.paymentState,
      paymentInstructions: instructions && {
        amountMinor: instructions.amountMinor,
        variableSymbol: instructions.variableSymbol,
        account: { ...instructions.account },
        reminderAt: instructions.reminderAt.toISOString(),
      },
      paymentLinkToken: model.paymentLinkToken,
      payments: model.payments.map(ReceivedPaymentDto.from),
      contact: { ...model.contact },
      version: model.version,
      isCancelled: model.isCancelled,
      canChange: model.canChange,
    };
  }
}

export class ParticipantRegistrationDetailDto extends ParticipantRegistrationDto {
  @ApiProperty({
    type: [AvailableTermDto],
    description: 'Every term of the event, by start, for moving to another.',
  })
  availableTerms!: AvailableTermDto[];

  static fromDetail(
    model: ParticipantRegistrationModel,
    terms: (EventTermInfo & { isFull: boolean })[],
  ): ParticipantRegistrationDetailDto {
    return {
      ...ParticipantRegistrationDto.from(model),
      availableTerms: terms.map((term) => ({
        termId: term.id,
        label: term.label,
        startDate: term.startDate,
        endDate: term.endDate,
        priceMinor: term.priceMinor,
        isFull: term.isFull,
      })),
    };
  }
}

export class ParticipantRegistrationListDto {
  @ApiProperty({
    type: [ParticipantRegistrationDto],
    description: 'Only the signed-in participant’s own, newest first.',
  })
  registrations!: ParticipantRegistrationDto[];

  static from(
    models: ParticipantRegistrationModel[],
  ): ParticipantRegistrationListDto {
    return { registrations: models.map(ParticipantRegistrationDto.from) };
  }
}
