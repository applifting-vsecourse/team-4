import { MAX_PAYMENT_MINOR } from '@/modules/registrations/domain/payment';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsInt,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A payment received by hand (S2-12). Payments are never edited afterwards. */
export class PaymentInputDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Generated when the dialog opens and sent with every retry. The same ' +
      'key and content return the saved payment (200) without a second ' +
      'record; the same key with other content gives 409 `submission_key_reused`.',
  })
  @IsUUID('all', { message: 'Neplatný identifikátor odeslání.' })
  submissionKey!: string;

  @ApiProperty({
    minimum: 1,
    maximum: MAX_PAYMENT_MINOR,
    example: 60000,
    description: 'Amount in haléře (CZK × 100), so at most two decimals.',
  })
  @IsDefined({ message: 'Zadejte částku.' })
  @IsInt({ message: 'Částka může mít nejvýše dvě desetinná místa.' })
  @Min(1, { message: 'Částka musí být větší než nula.' })
  @Max(MAX_PAYMENT_MINOR, {
    message: 'Částka může být nejvýše 10 000 000 Kč.',
  })
  amountMinor!: number;

  @ApiProperty({
    format: 'date',
    example: '2027-07-02',
    description: 'Day the money arrived; not after today in Europe/Prague.',
  })
  @IsString({ message: 'Zadejte datum přijetí.' })
  @Matches(CALENDAR_DATE, { message: 'Zadejte platné datum přijetí.' })
  @IsISO8601({ strict: true }, { message: 'Zadejte platné datum přijetí.' })
  receivedOn!: string;
}
