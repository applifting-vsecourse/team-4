import {
  PAYMENT_STATES,
  PaymentState,
} from '@/modules/registrations/domain/managed-registration';
import { ParticipationStatus } from '@/modules/registrations/domain/registration';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

const STATUSES: ParticipationStatus[] = ['confirmed', 'waitlisted'];

export class RegistrationFilterDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only registrations with this term of the event.',
  })
  @IsOptional()
  @IsUUID()
  termId?: string;

  @ApiPropertyOptional({
    enum: STATUSES,
    description:
      'Status in the filtered term, or in any term without a term filter.',
  })
  @IsOptional()
  @IsIn(STATUSES)
  status?: ParticipationStatus;

  @ApiPropertyOptional({
    enum: PAYMENT_STATES,
    description: 'Payment state of the whole registration.',
  })
  @IsOptional()
  @IsIn(PAYMENT_STATES)
  payment?: PaymentState;
}
