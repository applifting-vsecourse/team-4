import { REASON_MAX_LENGTH } from '@/modules/accommodation/domain/determination';
import { DecisionRecord } from '@/modules/accommodation/repositories/term-decision.repository';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ConfirmProposalDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'The run whose proposal the organizer saw (`proposalRun.id`). It must ' +
      'still be the term’s current one, else 409 `proposal_stale`.',
  })
  @IsUUID('all', { message: 'Neplatný návrh.' })
  runId!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'One per confirmation click. Repeating it saves nothing again and ' +
      'returns the same result.',
  })
  @IsUUID('all', { message: 'Neplatný klíč.' })
  submissionKey!: string;
}

export class DecisionDeterminationDto {
  @ApiProperty({ example: 'female' })
  @IsString({ message: 'Vyberte hodnotu.' })
  @IsNotEmpty({ message: 'Vyberte hodnotu.' })
  value!: string;

  @ApiProperty({ type: String, nullable: true })
  @ValidateIf((_: object, value: unknown) => value !== null)
  @IsString({ message: 'Neplatná odpověď.' })
  answer!: string | null;

  @ApiProperty({ maxLength: REASON_MAX_LENGTH })
  @Transform(trim)
  @IsString({ message: 'Uveďte důvod.' })
  @IsNotEmpty({ message: 'Uveďte důvod.' })
  @MaxLength(REASON_MAX_LENGTH, {
    message: `Důvod může mít nejvýše ${REASON_MAX_LENGTH} znaků.`,
  })
  reason!: string;
}

export class DecideParticipationDto {
  @ApiProperty({ enum: ['confirm', 'waitlist'] })
  @IsIn(['confirm', 'waitlist'], { message: 'Neplatné rozhodnutí.' })
  decision!: 'confirm' | 'waitlist';

  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Neplatný klíč.' })
  submissionKey!: string;

  @ApiProperty({
    type: DecisionDeterminationDto,
    required: false,
    description:
      'Required to confirm a person without an effective value while a hard ' +
      'attribute applies (400 `determination_required`); not accepted otherwise.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DecisionDeterminationDto)
  determination?: DecisionDeterminationDto;
}

class DecidedPersonDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class ConfirmedProposalDto {
  @ApiProperty({ type: [DecidedPersonDto] })
  confirmed!: DecidedPersonDto[];

  @ApiProperty({ description: 'True when the request was already saved.' })
  isReplay!: boolean;
}

export class ParticipationDecidedDto {
  @ApiProperty({ enum: ['confirmed', 'waitlisted'] })
  status!: 'confirmed' | 'waitlisted';
}

export class DecisionRecordDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty()
  actor!: { id: string; name: string };

  @ApiProperty({ enum: ['bulk', 'individual'] })
  kind!: 'bulk' | 'individual';

  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  termLabel!: string;

  @ApiProperty({ enum: ['pending', 'confirmed', 'waitlisted', 'cancelled'] })
  from!: string;

  @ApiProperty({ enum: ['pending', 'confirmed', 'waitlisted', 'cancelled'] })
  to!: string;

  @ApiProperty({
    nullable: true,
    description: 'The proposal a bulk confirmation used.',
  })
  run!: { id: string; finishedAt: string } | null;

  @ApiProperty({ description: 'People confirmed in the same request.' })
  batchSize!: number;

  static from(record: DecisionRecord): DecisionRecordDto {
    return {
      ...record,
      createdAt: record.createdAt.toISOString(),
      run: record.run && {
        id: record.run.id,
        finishedAt: record.run.finishedAt.toISOString(),
      },
    };
  }
}
