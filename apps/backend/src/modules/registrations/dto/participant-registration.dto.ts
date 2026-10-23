import {
  PAYMENT_STATES,
  PaymentState,
} from '@/modules/registrations/domain/managed-registration';
import { ParticipantRegistrationModel } from '@/modules/registrations/domain/participant-registration';
import { ReceivedPaymentDto } from '@/modules/registrations/dto/managed-registration.dto';
import {
  EventSummaryDto,
  PaymentInstructionsDto,
  RegistrationTermResultDto,
} from '@/modules/registrations/dto/registration-result.dto';
import { ApiProperty } from '@nestjs/swagger';

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
    type: [ReceivedPaymentDto],
    description: 'By the day received, oldest first.',
  })
  payments!: ReceivedPaymentDto[];

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
      payments: model.payments.map(ReceivedPaymentDto.from),
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
