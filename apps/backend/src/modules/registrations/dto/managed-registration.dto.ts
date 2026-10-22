import {
  ManagedRegistrationModel,
  PAYMENT_STATES,
  PaymentState,
  ReceivedPayment,
  RegistrationList,
} from '@/modules/registrations/domain/managed-registration';
import { RegistrationTermResultDto } from '@/modules/registrations/dto/registration-result.dto';
import { ApiProperty } from '@nestjs/swagger';

const PAYMENT_STATE_DESCRIPTION =
  '`none`: nothing due, nothing paid · `unpaid` · `partial` · `paid` · ' +
  '`overpaid`, which includes a payment with nothing due.';

export class RegistrationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time', description: 'Server time of receipt.' })
  receivedAt!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ description: 'E.164.' })
  phone!: string;

  @ApiProperty({
    type: [RegistrationTermResultDto],
    description: 'Selected terms by start, each with its own status.',
  })
  terms!: RegistrationTermResultDto[];

  @ApiProperty({ description: 'Σ confirmed terms, in haléře.' })
  amountDueMinor!: number;

  @ApiProperty({ description: 'Σ received payments, in haléře.' })
  paidMinor!: number;

  @ApiProperty({
    description: 'Due − paid: positive a debt, 0 settled, negative overpaid.',
  })
  balanceMinor!: number;

  @ApiProperty({ enum: PAYMENT_STATES, description: PAYMENT_STATE_DESCRIPTION })
  paymentState!: PaymentState;

  static from(model: ManagedRegistrationModel): RegistrationSummaryDto {
    return {
      id: model.id,
      receivedAt: model.receivedAt.toISOString(),
      firstName: model.firstName,
      lastName: model.lastName,
      email: model.email,
      phone: model.phone,
      terms: model.terms.map(RegistrationTermResultDto.from),
      amountDueMinor: model.amountDueMinor,
      paidMinor: model.paidMinor,
      balanceMinor: model.balanceMinor,
      paymentState: model.paymentState,
    };
  }
}

export class RegistrationListDto {
  @ApiProperty({
    description: 'All registrations of the event, regardless of the filters.',
  })
  total!: number;

  @ApiProperty({
    type: [RegistrationSummaryDto],
    description: 'Those matching the filters, oldest first.',
  })
  registrations!: RegistrationSummaryDto[];

  static from(list: RegistrationList): RegistrationListDto {
    return {
      total: list.total,
      registrations: list.registrations.map(RegistrationSummaryDto.from),
    };
  }
}

export class ReceivedPaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date' })
  receivedOn!: string;

  @ApiProperty({ description: 'In haléře.' })
  amountMinor!: number;

  static from(model: ReceivedPayment): ReceivedPaymentDto {
    return { ...model };
  }
}

export class RegistrationDetailDto extends RegistrationSummaryDto {
  @ApiProperty({ description: 'Σ all selected terms, in haléře.' })
  selectedPriceMinor!: number;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    type: String,
    description:
      'Payment reminder date (not a deadline); null while nothing is due.',
  })
  reminderAt!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Null while nothing is due.',
  })
  variableSymbol!: string | null;

  @ApiProperty({
    type: [ReceivedPaymentDto],
    description: 'By the day received, oldest first.',
  })
  payments!: ReceivedPaymentDto[];

  static from(model: ManagedRegistrationModel): RegistrationDetailDto {
    const hasObligation = model.amountDueMinor > 0;
    return {
      ...RegistrationSummaryDto.from(model),
      selectedPriceMinor: model.selectedPriceMinor,
      reminderAt: model.reminderAt?.toISOString() ?? null,
      variableSymbol: hasObligation ? model.variableSymbol : null,
      payments: model.payments.map(ReceivedPaymentDto.from),
    };
  }
}
