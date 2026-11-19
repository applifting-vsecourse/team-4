import {
  BankTransactionModel,
  StatementImportModel,
} from '@/modules/payments/domain/bank-transaction';
import { trim } from '@/modules/registrations/dto/registration-input.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class BankTransactionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: "The bank's own id of the movement." })
  bankTransactionId!: string;

  @ApiProperty({ format: 'date', example: '2027-03-02' })
  bookedOn!: string;

  @ApiProperty({ description: 'Received amount in haléře, > 0.' })
  amountMinor!: number;

  @ApiProperty({ type: String, nullable: true, example: '1001' })
  variableSymbol!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '123456789/0100' })
  counterpartyAccount!: string | null;

  @ApiProperty({ type: String, nullable: true })
  counterpartyName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  message!: string | null;

  @ApiProperty({ format: 'date-time' })
  importedAt!: string;

  static from(model: BankTransactionModel): BankTransactionDto {
    return {
      id: model.id,
      bankTransactionId: model.bankTransactionId,
      bookedOn: model.bookedOn,
      amountMinor: model.amountMinor,
      variableSymbol: model.variableSymbol,
      counterpartyAccount: model.counterpartyAccount,
      counterpartyName: model.counterpartyName,
      message: model.message,
      importedAt: model.importedAt.toISOString(),
    };
  }
}

export class BankTransactionsDto {
  @ApiProperty({
    type: () => [BankTransactionDto],
    description: 'Newest first.',
  })
  transactions!: BankTransactionDto[];

  static from(models: BankTransactionModel[]): BankTransactionsDto {
    return { transactions: models.map(BankTransactionDto.from) };
  }
}

export class StatementImportDto {
  @ApiProperty({ description: 'Incoming movements in the file.' })
  received!: number;

  @ApiProperty({ description: 'Of them, new to the event and stored.' })
  imported!: number;

  @ApiProperty({ description: 'Of them, imported before and skipped.' })
  duplicates!: number;

  @ApiProperty({ description: 'Outgoing movements in the file, not imported.' })
  skippedOutgoing!: number;

  @ApiProperty({
    description:
      'Transactions of the event paired by their variable symbol, also ones ' +
      'that waited from an earlier import.',
  })
  paired!: number;

  static from(model: StatementImportModel): StatementImportDto {
    return { ...model };
  }
}

/** The organizer's manual pairing of a queued transaction (F24). */
export class ManualPairingDto {
  @ApiProperty({
    format: 'uuid',
    description: 'A registration of the same event.',
  })
  @IsUUID('all', { message: 'Vyberte přihlášku.' })
  registrationId!: string;

  @ApiProperty({
    maxLength: 500,
    description: 'Why the transaction belongs to it.',
  })
  @Transform(trim)
  @IsString({ message: 'Uveďte důvod přiřazení.' })
  @IsNotEmpty({ message: 'Uveďte důvod přiřazení.' })
  @MaxLength(500, { message: 'Důvod může mít nejvýše 500 znaků.' })
  reason!: string;
}
