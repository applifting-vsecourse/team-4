import { determiningValues } from '@/modules/accommodation/domain/determination';
import {
  OrderedPerson,
  QueueView,
} from '@/modules/accommodation/domain/term-evaluation';
import {
  EvaluationMode,
  RunEvidence,
  RunListItem,
} from '@/modules/accommodation/repositories/term-evaluation.repository';
import { TermEvaluation } from '@/modules/accommodation/services/term-evaluation.service';
import { SolverResult } from '@/modules/accommodation/solver/solver.types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const MODES: EvaluationMode[] = ['automatic', 'manual'];
const STATUSES = [
  'none',
  'running',
  'current',
  'stale',
  'failed',
  'timeout',
  'infeasible',
] as const;
const RUN_STATUSES = ['solved', 'infeasible', 'timeout', 'failed'] as const;
const RESULTS = ['suitable', 'unsuitable', 'manual'] as const;
const REASONS = ['A', 'B', 'C', 'N', 'R'] as const;

// ─── Mode ───────────────────────────────────────────────────────────────────

export class EvaluationModeDto {
  @ApiProperty({
    enum: MODES,
    description:
      '`automatic`: a change of a term’s inputs evaluates it after 10 s ' +
      'without another change · `manual`: only "Přepočítat" does. Neither ' +
      'confirms anyone, creates a debt or sends an e-mail.',
  })
  @IsIn(MODES, { message: 'Vyberte automatický nebo ruční přepočet.' })
  mode!: EvaluationMode;
}

// ─── Term evaluation ────────────────────────────────────────────────────────

export class EvaluationTermDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;
}

export class HardAttributeDto {
  @ApiProperty({ example: 'gender' })
  attribute!: string;

  @ApiProperty({
    type: [String],
    description: 'Answers that do not determine a room; no answer never does.',
  })
  nonDeterminingValues!: string[];

  @ApiProperty({
    type: [String],
    description: 'The values a room carries and the organizer may determine.',
  })
  determiningValues!: string[];
}

export class ProposalRunDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  finishedAt!: string;

  @ApiProperty({
    description: 'It read the term’s current input version.',
  })
  isCurrent!: boolean;
}

export class ConflictPersonDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class ConflictDto {
  @ApiProperty({ enum: ['capacity', 'homogeneity'] })
  constraint!: 'capacity' | 'homogeneity';

  @ApiProperty({
    type: [ConflictPersonDto],
    description: 'The confirmed participants who no longer fit (spec §7.4).',
  })
  confirmed!: ConflictPersonDto[];
}

export class CapacityProposalDto {
  @ApiProperty()
  suitable!: number;

  @ApiProperty({ description: 'Reasons A, B, C and N.' })
  unsuitable!: number;

  @ApiProperty({ description: 'Reason R: needs a manual determination.' })
  manual!: number;

  @ApiProperty({
    description: 'Base beds the confirmed and the suitable take.',
  })
  baseUsed!: number;

  @ApiProperty()
  extraUsed!: number;
}

export class CapacityDto {
  @ApiProperty({ description: 'Of the rooms available in the term.' })
  baseBeds!: number;

  @ApiProperty()
  extraBeds!: number;

  @ApiProperty()
  confirmed!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  waitlisted!: number;

  @ApiPropertyOptional({
    type: CapacityProposalDto,
    description: 'The impact of the shown proposal; missing without one.',
  })
  proposal?: CapacityProposalDto;
}

export class QueueDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The effective value of the hard attribute; null for the one queue ' +
      'of everyone without a hard attribute.',
  })
  value!: string | null;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  waitlisted!: number;

  @ApiPropertyOptional({ description: 'From the shown proposal.' })
  suitable?: number;

  @ApiPropertyOptional({ description: 'From the shown proposal.' })
  unsuitable?: number;

  static from(queue: QueueView): QueueDto {
    return { ...queue };
  }
}

export class OrderedPersonDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ format: 'date-time' })
  receivedAt!: string;

  @ApiProperty({ enum: ['pending', 'waitlisted'] })
  status!: 'pending' | 'waitlisted';

  @ApiProperty({ description: '1 is the highest priority in the term.' })
  position!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The participant’s own answer to the hard attribute.',
  })
  answer!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The organizer’s determination, while valid for the answer.',
  })
  determinedValue!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Its queue. Null with a hard attribute: needs a manual determination; ' +
      'always null without one.',
  })
  effectiveValue!: string | null;

  @ApiPropertyOptional({
    enum: RESULTS,
    description: 'Missing when the shown proposal did not evaluate the person.',
  })
  result?: (typeof RESULTS)[number];

  @ApiPropertyOptional({ enum: REASONS })
  reason?: (typeof REASONS)[number];

  static from(person: OrderedPerson): OrderedPersonDto {
    return { ...person, receivedAt: person.receivedAt.toISOString() };
  }
}

export class TermEvaluationDto {
  @ApiProperty({ enum: MODES })
  mode!: EvaluationMode;

  @ApiProperty({ type: EvaluationTermDto })
  term!: EvaluationTermDto;

  @ApiProperty({
    type: HardAttributeDto,
    nullable: true,
    description: 'Null: one queue by capacity and order, no reasons B or R.',
  })
  hardAttribute!: HardAttributeDto | null;

  @ApiProperty({
    description: 'The event has any room; without one no capacity is recorded.',
  })
  hasRooms!: boolean;

  @ApiProperty({
    enum: STATUSES,
    description:
      '`current` / `stale`: the shown proposal matches / no longer matches ' +
      'the term’s inputs · `running` · `failed` / `timeout`: the last run did ' +
      'not finish · `infeasible`: the confirmed no longer fit · `none`.',
  })
  status!: (typeof STATUSES)[number];

  @ApiProperty({ description: 'Bumped by every change of the term’s inputs.' })
  inputVersion!: number;

  @ApiProperty({
    format: 'date-time',
    type: String,
    nullable: true,
    description:
      'When the next evaluation is due; null when none is scheduled.',
  })
  scheduledAt!: string | null;

  @ApiProperty({ type: ProposalRunDto, nullable: true })
  proposalRun!: ProposalRunDto | null;

  @ApiProperty({ type: ConflictDto, nullable: true })
  conflict!: ConflictDto | null;

  @ApiProperty({ type: CapacityDto })
  capacity!: CapacityDto;

  @ApiProperty({ type: [QueueDto] })
  queues!: QueueDto[];

  @ApiProperty({
    description: 'Unconfirmed people waiting for a manual determination.',
  })
  manualCount!: number;

  @ApiProperty({
    type: [OrderedPersonDto],
    description: 'Every unconfirmed participant of the term, by position.',
  })
  order!: OrderedPersonDto[];

  static from(evaluation: TermEvaluation): TermEvaluationDto {
    const { view } = evaluation;
    return {
      mode: evaluation.mode,
      term: evaluation.term,
      hardAttribute: evaluation.hardAttribute && {
        ...evaluation.hardAttribute,
        determiningValues: determiningValues(evaluation.hardAttribute),
      },
      hasRooms: evaluation.hasRooms,
      status: view.status,
      inputVersion: view.inputVersion,
      scheduledAt: evaluation.scheduledAt?.toISOString() ?? null,
      proposalRun: view.proposalRun && {
        ...view.proposalRun,
        finishedAt: view.proposalRun.finishedAt.toISOString(),
      },
      conflict: view.conflict,
      capacity: view.capacity,
      queues: view.queues.map(QueueDto.from),
      manualCount: view.manualCount,
      order: view.order.map(OrderedPersonDto.from),
    };
  }
}

// ─── Runs ───────────────────────────────────────────────────────────────────

export class RunActorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class RunSummaryDto {
  @ApiProperty()
  suitable!: number;

  @ApiProperty()
  unsuitable!: number;

  @ApiProperty()
  manual!: number;
}

const summaryOf = (run: Pick<RunListItem, 'result'>): RunSummaryDto | null =>
  run.result?.status === 'solved'
    ? {
        suitable: run.result.suitable.length,
        unsuitable: run.result.unplaced.filter((u) => u.reason !== 'R').length,
        manual: run.result.unplaced.filter((u) => u.reason === 'R').length,
      }
    : null;

export class RunListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: RUN_STATUSES })
  status!: (typeof RUN_STATUSES)[number];

  @ApiProperty({ format: 'date-time' })
  startedAt!: string;

  @ApiProperty({ format: 'date-time' })
  finishedAt!: string;

  @ApiProperty({
    type: RunActorDto,
    nullable: true,
    description: 'The organizer who asked for it; null when the system ran it.',
  })
  triggeredBy!: RunActorDto | null;

  @ApiProperty()
  inputVersion!: number;

  @ApiProperty({ description: 'It read the term’s current input version.' })
  isCurrent!: boolean;

  @ApiProperty({
    type: RunSummaryDto,
    nullable: true,
    description: 'For a solved run.',
  })
  summary!: RunSummaryDto | null;

  static from(run: RunListItem, inputVersion: number): RunListItemDto {
    return {
      id: run.id,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt.toISOString(),
      triggeredBy: run.triggeredBy,
      inputVersion: run.inputVersion,
      isCurrent: run.inputVersion === inputVersion,
      summary: summaryOf(run),
    };
  }
}

export class RunListDto {
  @ApiProperty({ type: [RunListItemDto], description: 'Newest first.' })
  runs!: RunListItemDto[];

  static from(list: { inputVersion: number; runs: RunListItem[] }): RunListDto {
    return {
      runs: list.runs.map((run) => RunListItemDto.from(run, list.inputVersion)),
    };
  }
}

export class EvidenceRoomDto {
  @ApiProperty({ format: 'uuid' })
  roomId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  baseBeds!: number;

  @ApiProperty()
  extraBeds!: number;
}

export class EvidencePersonDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty({ description: 'Today’s name; not an input of the run.' })
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ format: 'date-time' })
  receivedAt!: string;

  @ApiProperty({ type: String, nullable: true })
  answer!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The determination the run used.',
  })
  manualValue!: string | null;

  @ApiProperty({ type: String, nullable: true })
  effectiveValue!: string | null;

  @ApiPropertyOptional({
    description: '1 is the highest priority; unconfirmed only.',
  })
  position?: number;

  @ApiPropertyOptional({ enum: RESULTS })
  result?: (typeof RESULTS)[number];

  @ApiPropertyOptional({ enum: REASONS })
  reason?: (typeof REASONS)[number];
}

export class RunEvidenceDto extends RunListItemDto {
  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  termLabel!: string;

  @ApiProperty({ example: 'highs-phase1/1' })
  solverVersion!: string;

  @ApiProperty({
    type: HardAttributeDto,
    nullable: true,
    description: 'The rules the run used.',
  })
  hardAttribute!: HardAttributeDto | null;

  @ApiProperty({ type: [EvidenceRoomDto] })
  rooms!: EvidenceRoomDto[];

  @ApiProperty({ type: [EvidencePersonDto] })
  confirmed!: EvidencePersonDto[];

  @ApiProperty({ description: 'A manual order (F39-1) applied.' })
  isOrderManual!: boolean;

  @ApiProperty({
    type: [EvidencePersonDto],
    description: 'The order the run used.',
  })
  order!: EvidencePersonDto[];

  @ApiPropertyOptional({ type: ConflictDto })
  conflict?: ConflictDto;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Why a failed run failed.',
  })
  error!: string | null;

  static fromEvidence(run: RunEvidence): RunEvidenceDto {
    const { input } = run;
    const result = run.result as SolverResult | null;
    const name = (id: string): { firstName: string; lastName: string } =>
      run.names.get(id) ?? { firstName: '', lastName: '' };
    const solved = result?.status === 'solved' ? result : null;
    const outcome = (
      id: string,
    ): Pick<EvidencePersonDto, 'result' | 'reason'> => {
      if (!solved) return {};
      if (solved.suitable.includes(id)) return { result: 'suitable' };
      const unplaced = solved.unplaced.find((u) => u.id === id);
      if (!unplaced) return {};
      return {
        result: unplaced.reason === 'R' ? 'manual' : 'unsuitable',
        reason: unplaced.reason,
      };
    };
    const person = (
      snapshot: (typeof input.confirmed)[number],
    ): Omit<EvidencePersonDto, 'position' | 'result' | 'reason'> => ({
      registrationId: snapshot.registrationId,
      ...name(snapshot.registrationId),
      receivedAt: snapshot.receivedAt,
      answer: snapshot.answer,
      manualValue: snapshot.manualValue,
      effectiveValue: snapshot.effectiveValue,
    });
    return {
      ...RunListItemDto.from(
        {
          ...run,
          result: run.result as RunListItem['result'],
          triggeredBy: run.triggeredBy,
        },
        run.currentInputVersion,
      ),
      termId: run.termId,
      termLabel: run.termLabel,
      solverVersion: run.solverVersion,
      hardAttribute: input.rules.hardAttribute && {
        attribute: input.rules.hardAttribute.attribute,
        nonDeterminingValues: [
          ...input.rules.hardAttribute.nonDeterminingValues,
        ],
        determiningValues: determiningValues(input.rules.hardAttribute),
      },
      rooms: input.rooms,
      confirmed: input.confirmed.map(person),
      isOrderManual: input.isOrderManual,
      order: input.order.map((snapshot) => ({
        ...person(snapshot),
        position: snapshot.position + 1,
        ...outcome(snapshot.registrationId),
      })),
      ...(result?.status === 'infeasible'
        ? {
            conflict: {
              constraint: result.constraint,
              confirmed: result.conflicting.map((id) => ({
                registrationId: id,
                ...name(id),
              })),
            },
          }
        : {}),
      error: run.error,
    };
  }
}
