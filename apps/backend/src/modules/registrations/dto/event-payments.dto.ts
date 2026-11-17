import {
  EventPayment,
  EventPayments,
  PaymentRegistration,
  RegistrationBalance,
} from '@/modules/registrations/domain/event-payments';
import {
  PAYMENT_SOURCES,
  PAYMENT_STATES,
  PaymentSource,
  PaymentState,
} from '@/modules/registrations/domain/managed-registration';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentRegistrationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Null while nothing is due.',
  })
  variableSymbol!: string | null;

  static from(model: PaymentRegistration): PaymentRegistrationDto {
    return { ...model };
  }
}

export class EventPaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date' })
  receivedOn!: string;

  @ApiProperty({ description: 'In haléře.' })
  amountMinor!: number;

  @ApiProperty({
    enum: PAYMENT_SOURCES,
    description: '`qr_link` for a payment made through the QR link.',
  })
  source!: PaymentSource;

  @ApiProperty({ type: PaymentRegistrationDto })
  registration!: PaymentRegistrationDto;

  static from(model: EventPayment): EventPaymentDto {
    return {
      id: model.id,
      receivedOn: model.receivedOn,
      amountMinor: model.amountMinor,
      source: model.source,
      registration: PaymentRegistrationDto.from(model.registration),
    };
  }
}

export class RegistrationBalanceDto {
  @ApiProperty({ type: PaymentRegistrationDto })
  registration!: PaymentRegistrationDto;

  @ApiProperty({ description: 'Σ confirmed terms, in haléře.' })
  amountDueMinor!: number;

  @ApiProperty({ description: 'Σ received payments, in haléře.' })
  paidMinor!: number;

  @ApiProperty({
    description: 'Due − paid: positive a debt, 0 settled, negative overpaid.',
  })
  balanceMinor!: number;

  @ApiProperty({
    enum: PAYMENT_STATES,
    description: 'As in the registration list; never `none` here.',
  })
  paymentState!: PaymentState;

  static from(model: RegistrationBalance): RegistrationBalanceDto {
    return {
      registration: PaymentRegistrationDto.from(model.registration),
      amountDueMinor: model.amountDueMinor,
      paidMinor: model.paidMinor,
      balanceMinor: model.balanceMinor,
      paymentState: model.paymentState,
    };
  }
}

export class EventPaymentsDto {
  @ApiProperty({
    type: [EventPaymentDto],
    description: 'Newest first: by the day received, then the latest recorded.',
  })
  payments!: EventPaymentDto[];

  @ApiProperty({
    type: [RegistrationBalanceDto],
    description:
      'Registrations with something due or paid, oldest registration first.',
  })
  balances!: RegistrationBalanceDto[];

  static from(model: EventPayments): EventPaymentsDto {
    return {
      payments: model.payments.map(EventPaymentDto.from),
      balances: model.balances.map(RegistrationBalanceDto.from),
    };
  }
}
