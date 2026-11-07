import { REASON_MAX_LENGTH } from '@/modules/accommodation/domain/determination';
import { Placement } from '@/modules/accommodation/domain/term-order';
import { ActorDto } from '@/modules/accommodation/dto/actor.dto';
import { MoveRecord } from '@/modules/accommodation/repositories/order-moves.repository';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

const PLACEMENTS: Placement[] = ['before', 'after'];

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class MoveInOrderDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'The person to move: pending or waitlisted in the term and, with a ' +
      'hard attribute, with an effective value; else 400 `person_not_movable`.',
  })
  @IsUUID('all', { message: 'Vyberte osobu, která se má přesunout.' })
  registrationId!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Another unconfirmed person of the same queue; else 400 ' +
      '`target_invalid`, or `order_unchanged` when the person already stands there.',
  })
  @IsUUID('all', {
    message: 'Vyberte osobu, před kterou nebo za kterou se má přesunout.',
  })
  targetId!: string;

  @ApiProperty({ enum: PLACEMENTS })
  @IsIn(PLACEMENTS, { message: 'Vyberte, zda před osobu, nebo za ni.' })
  placement!: Placement;

  @ApiProperty({
    maxLength: REASON_MAX_LENGTH,
    description: 'Trimmed; required.',
  })
  @Transform(trim)
  @IsString({ message: 'Uveďte důvod změny pořadí.' })
  @IsNotEmpty({ message: 'Uveďte důvod změny pořadí.' })
  @MaxLength(REASON_MAX_LENGTH, {
    message: `Důvod může mít nejvýše ${REASON_MAX_LENGTH} znaků.`,
  })
  reason!: string;

  @ApiProperty({
    description:
      'The term’s `inputVersion` the organizer saw. Any other gives 409 ' +
      '`order_stale`, except the same move sent again, which changes nothing ' +
      'more and answers with the term as it is now.',
  })
  @IsInt({ message: 'Načtěte frontu znovu.' })
  @Min(0, { message: 'Načtěte frontu znovu.' })
  expectedVersion!: number;
}

export class MovePersonDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class MoveRecordDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: ActorDto })
  actor!: ActorDto;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  termLabel!: string;

  @ApiProperty({ type: MovePersonDto })
  person!: MovePersonDto;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The effective value; null for the one queue without a hard attribute.',
  })
  queue!: string | null;

  @ApiProperty({ enum: PLACEMENTS })
  placement!: Placement;

  @ApiProperty({ type: MovePersonDto })
  target!: MovePersonDto;

  @ApiProperty({
    description:
      'In the term order before the move; 1 is the highest priority.',
  })
  fromPosition!: number;

  @ApiProperty({ description: 'In the term order after the move.' })
  toPosition!: number;

  @ApiProperty({
    description: 'The term’s input version the move was made on.',
  })
  inputVersion!: number;

  static from(record: MoveRecord): MoveRecordDto {
    return {
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      actor: record.actor,
      reason: record.reason,
      termId: record.termId,
      termLabel: record.termLabel,
      person: { registrationId: record.registrationId, ...record.person },
      queue: record.queue,
      placement: record.placement,
      target: { registrationId: record.targetId, ...record.target },
      fromPosition: record.fromPosition,
      toPosition: record.toPosition,
      inputVersion: record.inputVersion,
    };
  }
}
