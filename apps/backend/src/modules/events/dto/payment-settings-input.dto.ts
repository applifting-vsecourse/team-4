import { MAX_PAYMENT_DUE_DAYS } from '@/modules/events/domain/payment-settings';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// An empty prefix means "no prefix".
const emptyToNull = ({ value }: { value: unknown }): unknown => {
  const trimmed = trim({ value });
  return trimmed === '' ? null : trimmed;
};

export class PaymentSettingsInputDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '19',
    description: 'Account prefix, 1–6 digits. Empty or null for none.',
  })
  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{1,6}$/, {
    message: 'Předčíslí tvoří nejvýše 6 číslic.',
  })
  bankAccountPrefix?: string | null;

  @ApiProperty({
    example: '2000145399',
    description: 'Account number, 2–10 digits.',
  })
  @Transform(trim)
  @IsString({ message: 'Vyplňte číslo účtu.' })
  @Matches(/^[0-9]{2,10}$/, {
    message: 'Číslo účtu tvoří 2 až 10 číslic.',
  })
  bankAccountNumber!: string;

  @ApiProperty({ example: '0800', description: 'Bank code, 4 digits.' })
  @Transform(trim)
  @IsString({ message: 'Vyplňte kód banky.' })
  @Matches(/^[0-9]{4}$/, { message: 'Kód banky tvoří 4 číslice.' })
  bankCode!: string;

  @ApiProperty({
    minimum: 1,
    maximum: MAX_PAYMENT_DUE_DAYS,
    example: 14,
    description: 'Days from confirmation to the payment due date.',
  })
  @IsInt({ message: 'Splatnost zadejte jako celý počet dní.' })
  @Min(1, { message: 'Splatnost musí být alespoň 1 den.' })
  @Max(MAX_PAYMENT_DUE_DAYS, {
    message: `Splatnost může být nejvýše ${MAX_PAYMENT_DUE_DAYS} dní.`,
  })
  paymentDueDays!: number;
}
