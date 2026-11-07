import {
  determiningValues,
  needsDetermination,
  REASON_MAX_LENGTH,
} from '@/modules/accommodation/domain/determination';
import { ActorDto } from '@/modules/accommodation/dto/actor.dto';
import { MoveRecordDto } from '@/modules/accommodation/dto/order-moves.dto';
import { DecisionRecordDto } from '@/modules/accommodation/dto/term-decision.dto';
import { DeterminationRecord } from '@/modules/accommodation/repositories/registration-accommodation.repository';
import { RegistrationAccommodationView } from '@/modules/accommodation/services/registration-accommodation.service';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class DetermineAccommodationDto {
  @ApiProperty({
    example: 'female',
    description:
      'One of `hardAttribute.determiningValues`, else 400 `value_invalid`.',
  })
  @IsString({ message: 'Vyberte hodnotu.' })
  @IsNotEmpty({ message: 'Vyberte hodnotu.' })
  value!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The participant’s answer the organizer decided on; another one now ' +
      'gives 409 `answer_changed`.',
  })
  @ValidateIf((_: object, value: unknown) => value !== null)
  @IsString({ message: 'Neplatná odpověď.' })
  answer!: string | null;

  @ApiProperty({
    maxLength: REASON_MAX_LENGTH,
    description: 'Trimmed; required.',
  })
  @Transform(trim)
  @IsString({ message: 'Uveďte důvod.' })
  @IsNotEmpty({ message: 'Uveďte důvod.' })
  @MaxLength(REASON_MAX_LENGTH, {
    message: `Důvod může mít nejvýše ${REASON_MAX_LENGTH} znaků.`,
  })
  reason!: string;
}

export class AccommodationAttributeDto {
  @ApiProperty({ example: 'gender' })
  attribute!: string;

  @ApiProperty({ type: [String] })
  nonDeterminingValues!: string[];

  @ApiProperty({
    type: [String],
    description:
      'The values the organizer may determine, e.g. `female`, `male`.',
  })
  determiningValues!: string[];
}

export class DeterminationDto {
  @ApiProperty()
  value!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The answer it was made on.',
  })
  basedOnAnswer!: string | null;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: ActorDto })
  createdBy!: ActorDto;

  @ApiProperty({
    description:
      'False once the answer changed: the determination no longer applies.',
  })
  isValid!: boolean;
}

export class DeterminationRecordDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: ActorDto })
  actor!: ActorDto;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ type: String, nullable: true })
  answer!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The value it replaced.',
  })
  previousValue!: string | null;

  @ApiProperty()
  value!: string;

  static from(record: DeterminationRecord): DeterminationRecordDto {
    return { ...record, createdAt: record.createdAt.toISOString() };
  }
}

export class RegistrationAccommodationDto {
  @ApiProperty({
    type: AccommodationAttributeDto,
    nullable: true,
    description: 'Null: no hard attribute, so nobody needs a determination.',
  })
  hardAttribute!: AccommodationAttributeDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The participant’s own answer; never changed or guessed.',
  })
  answer!: string | null;

  @ApiProperty({ type: DeterminationDto, nullable: true })
  determination!: DeterminationDto | null;

  @ApiProperty({ type: String, nullable: true })
  effectiveValue!: string | null;

  @ApiProperty({
    description:
      'A hard attribute applies and there is no effective value (F64).',
  })
  needsDetermination!: boolean;

  @ApiProperty({ type: [DeterminationRecordDto], description: 'Newest first.' })
  history!: DeterminationRecordDto[];

  @ApiProperty({
    type: [MoveRecordDto],
    description:
      'The person’s moves in the terms’ orders (F39-1), newest first.',
  })
  moves!: MoveRecordDto[];

  @ApiProperty({
    type: [DecisionRecordDto],
    description:
      'Every confirmation and waitlisting of the registration (F39-1), ' +
      'newest first; never edited or deleted.',
  })
  decisions!: DecisionRecordDto[];

  static from(
    model: RegistrationAccommodationView,
  ): RegistrationAccommodationDto {
    const hard = model.hardAttribute;
    const determination = model.determination;
    return {
      hardAttribute: hard && {
        attribute: hard.attribute,
        nonDeterminingValues: [...hard.nonDeterminingValues],
        determiningValues: determiningValues(hard),
      },
      answer: model.answer,
      determination: determination && {
        ...determination,
        createdAt: determination.createdAt.toISOString(),
      },
      effectiveValue: model.effectiveValue,
      needsDetermination: needsDetermination(
        hard,
        model.answer,
        determination?.isValid ? determination : null,
      ),
      history: model.history.map(DeterminationRecordDto.from),
      moves: model.moves.map(MoveRecordDto.from),
      decisions: model.decisions.map(DecisionRecordDto.from),
    };
  }
}
