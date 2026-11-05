import {
  Gender,
  GENDER_OTHER_MAX_LENGTH,
  GENDERS,
} from '@/modules/registrations/domain/gender';
import { ParticipationStatus } from '@/modules/registrations/domain/registration';
import {
  CHANGEABLE_FIELDS,
  ChangeableField,
  ChangeKind,
  ChangePlan,
  ChangeSummary,
  Money,
  NeedsChange,
  PlannedMove,
  PlannedTerm,
} from '@/modules/registrations/domain/registration-change';
import {
  GENDER_MESSAGE,
  GenderOther,
  PHONE_MESSAGE,
  toE164,
  trim,
} from '@/modules/registrations/dto/registration-input.dto';
import { RegistrationNeedsDto } from '@/modules/registrations/dto/registration-needs.dto';
import {
  ChangePreview,
  RegistrationChangeModel,
} from '@/modules/registrations/repositories/registration-changes.repository';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const KINDS: ChangeKind[] = ['data', 'move', 'cancel_terms', 'cancel_all'];
const FIELDS: readonly ChangeableField[] = CHANGEABLE_FIELDS;
const STATES: ParticipationStatus[] = ['confirmed', 'waitlisted', 'cancelled'];
const STATUSES = ['pending', 'applied', 'approved', 'rejected'] as const;

// ─── Input ──────────────────────────────────────────────────────────────────

export class TermMoveDto {
  @ApiProperty({
    format: 'uuid',
    description: 'An active term of the registration.',
  })
  @IsUUID('all', { message: 'Neplatný termín.' })
  fromTermId!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'A term of the same event that is not active in the registration.',
  })
  @IsUUID('all', { message: 'Neplatný termín.' })
  toTermId!: string;

  @ApiProperty({
    description:
      'Consent to end on the waitlist and lose a confirmed place. Required ' +
      'when the move would end there, else 409 `waitlist_consent_required`.',
  })
  @IsBoolean()
  acceptWaitlist!: boolean;
}

/** What a participant changes; a field left out stays as it is. */
export class ChangeProposalDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_: object, value: unknown) => value !== undefined)
  @Transform(trim)
  @IsString({ message: 'Vyplňte jméno.' })
  @IsNotEmpty({ message: 'Vyplňte jméno.' })
  @MaxLength(100, { message: 'Jméno může mít nejvýše 100 znaků.' })
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_: object, value: unknown) => value !== undefined)
  @Transform(trim)
  @IsString({ message: 'Vyplňte příjmení.' })
  @IsNotEmpty({ message: 'Vyplňte příjmení.' })
  @MaxLength(100, { message: 'Příjmení může mít nejvýše 100 znaků.' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+420 777 123 456' })
  @ValidateIf((_: object, value: unknown) => value !== undefined)
  @Transform(toE164)
  @IsString({ message: PHONE_MESSAGE })
  @Matches(/^\+[1-9]\d{6,14}$/, { message: PHONE_MESSAGE })
  phone?: string;

  @ApiPropertyOptional({
    enum: GENDERS,
    nullable: true,
    description:
      'The voluntary answer for accommodation; null clears it back to "not answered".',
  })
  @ValidateIf((_: object, value: unknown) => value !== undefined)
  @IsIn([...GENDERS, null], { message: GENDER_MESSAGE })
  gender?: Gender | null;

  @ApiPropertyOptional({
    type: String,
    maxLength: GENDER_OTHER_MAX_LENGTH,
    nullable: true,
    description:
      'The own words for `gender: other` (this proposal or the stored one), ' +
      'else 400; null removes them. Another answer drops them by itself.',
  })
  @GenderOther('allow')
  genderOther?: string | null;

  @ApiPropertyOptional({
    type: RegistrationNeedsDto,
    description:
      'Transport, diet and health as a whole (F63); left out, they stay. ' +
      'A change of the whole registration, like the names.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegistrationNeedsDto)
  needs?: RegistrationNeedsDto;

  @ApiProperty({ type: [TermMoveDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TermMoveDto)
  moves!: TermMoveDto[];

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true, message: 'Neplatný termín.' })
  cancelledTermIds!: string[];
}

export class SubmitChangeDto extends ChangeProposalDto {
  @ApiProperty({
    description:
      'The registration version the proposal was made on; a newer one gives ' +
      '409 `registration_stale`.',
  })
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @ApiProperty({
    description:
      'What the review told the participant: a request for approval (true) ' +
      'or a direct change. A different result gives 409 `approval_changed`.',
  })
  @IsBoolean()
  expectsApproval!: boolean;
}

// ─── Output ─────────────────────────────────────────────────────────────────

export class ChangedValueDto {
  @ApiProperty({ enum: FIELDS })
  field!: ChangeableField;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'For `gender` one of its values, or null when not answered; for ' +
      '`genderOther` null when there are no own words.',
  })
  original!: string | null;

  @ApiProperty({ nullable: true, type: String })
  proposed!: string | null;
}

export class PlannedTermDto {
  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiProperty({ description: 'In haléře.' })
  priceMinor!: number;

  @ApiProperty({ enum: STATES, nullable: true, type: String })
  original!: ParticipationStatus | null;

  @ApiProperty({ enum: STATES, nullable: true, type: String })
  proposed!: ParticipationStatus | null;
}

export class MoneyDto {
  @ApiProperty({ description: 'Σ confirmed terms, in haléře.' })
  dueMinor!: number;

  @ApiProperty()
  paidMinor!: number;

  @ApiProperty({ description: 'Due − paid; negative is an overpayment.' })
  balanceMinor!: number;
}

export class NeedsChangeDto {
  @ApiProperty({ type: RegistrationNeedsDto })
  original!: RegistrationNeedsDto;

  @ApiProperty({ type: RegistrationNeedsDto })
  proposed!: RegistrationNeedsDto;

  static from(change: NeedsChange): NeedsChangeDto {
    return {
      original: RegistrationNeedsDto.from(change.original),
      proposed: RegistrationNeedsDto.from(change.proposed),
    };
  }
}

export class ChangeSummaryDto {
  @ApiProperty({ type: [ChangedValueDto] })
  values!: ChangedValueDto[];

  @ApiProperty({
    type: NeedsChangeDto,
    nullable: true,
    description: 'Transport, diet and health (F63); null when they stay.',
  })
  needs!: NeedsChangeDto | null;

  @ApiProperty({ type: [PlannedTermDto], description: 'By term start.' })
  terms!: PlannedTermDto[];

  @ApiProperty({ type: MoneyDto })
  original!: Money;

  @ApiProperty({ type: MoneyDto })
  proposed!: Money;

  static from(summary: ChangeSummary): ChangeSummaryDto {
    return {
      values: summary.values.map((value) => ({ ...value })),
      needs: summary.needs && NeedsChangeDto.from(summary.needs),
      terms: summary.terms.map((term: PlannedTerm) => ({ ...term })),
      original: { ...summary.original },
      proposed: { ...summary.proposed },
    };
  }
}

export class PlannedMoveDto {
  @ApiProperty({ format: 'uuid' })
  fromTermId!: string;

  @ApiProperty({ format: 'uuid' })
  toTermId!: string;

  @ApiProperty({ enum: STATES })
  resultStatus!: ParticipationStatus;

  @ApiProperty({
    description:
      'The move ends on the waitlist and gives up a confirmed place.',
  })
  requiresWaitlistConsent!: boolean;

  static from(move: PlannedMove): PlannedMoveDto {
    return {
      fromTermId: move.fromTermId,
      toTermId: move.toTermId,
      resultStatus: move.resultStatus,
      requiresWaitlistConsent: move.requiresWaitlistConsent,
    };
  }
}

export class ChangePreviewDto {
  @ApiProperty({ description: 'Send back as `expectedVersion`.' })
  version!: number;

  @ApiProperty({
    description: 'The organizer must approve; send back as `expectsApproval`.',
  })
  requiresApproval!: boolean;

  @ApiProperty({ enum: KINDS, isArray: true })
  kinds!: ChangeKind[];

  @ApiProperty({ type: [PlannedMoveDto] })
  moves!: PlannedMoveDto[];

  @ApiProperty({ type: ChangeSummaryDto })
  summary!: ChangeSummaryDto;

  static fromPlan(plan: ChangePlan, version: number): ChangePreviewDto {
    return {
      version,
      requiresApproval: plan.requiresApproval,
      kinds: plan.kinds,
      moves: plan.moves.map(PlannedMoveDto.from),
      summary: ChangeSummaryDto.from(plan.summary),
    };
  }

  static from({ version, plan }: ChangePreview): ChangePreviewDto {
    return ChangePreviewDto.fromPlan(plan, version);
  }
}

export class ChangeParticipantDto {
  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class RegistrationChangeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty({
    enum: STATUSES,
    description:
      '`applied`: executed at once · `pending`: waits for the organizer · ' +
      '`approved` · `rejected`.',
  })
  status!: (typeof STATUSES)[number];

  @ApiProperty({ enum: KINDS, isArray: true })
  kinds!: ChangeKind[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  decidedAt!: string | null;

  @ApiProperty({
    type: ChangeSummaryDto,
    description:
      'Worked out against today’s capacity while pending, frozen once decided.',
  })
  summary!: ChangeSummaryDto;

  @ApiProperty({
    description:
      'Pending, and a move now ends on the waitlist without the ' +
      'participant’s consent: approving waits for it.',
  })
  needsParticipantConsent!: boolean;

  @ApiProperty({
    description:
      'Pending, and the registration changed after the proposal was made: ' +
      'approving is refused (409 `registration_stale`); it can only be rejected.',
  })
  isStale!: boolean;

  @ApiProperty({ type: ChangeParticipantDto })
  participant!: ChangeParticipantDto;

  static from(model: RegistrationChangeModel): RegistrationChangeDto {
    return {
      id: model.id,
      registrationId: model.registrationId,
      status: model.status,
      kinds: model.kinds,
      createdAt: model.createdAt.toISOString(),
      decidedAt: model.decidedAt?.toISOString() ?? null,
      summary: ChangeSummaryDto.from(model.summary),
      needsParticipantConsent: model.needsParticipantConsent,
      isStale: model.isStale,
      participant: { ...model.registration },
    };
  }
}

export class RegistrationChangeListDto {
  @ApiProperty({ type: [RegistrationChangeDto] })
  changes!: RegistrationChangeDto[];

  static from(models: RegistrationChangeModel[]): RegistrationChangeListDto {
    return { changes: models.map(RegistrationChangeDto.from) };
  }
}

export class SubmittedChangeDto {
  @ApiProperty({
    enum: ['applied', 'requested'],
    description:
      '`applied`: the change is made · `requested`: it waits for approval.',
  })
  outcome!: 'applied' | 'requested';

  @ApiProperty({ type: RegistrationChangeDto })
  change!: RegistrationChangeDto;
}
