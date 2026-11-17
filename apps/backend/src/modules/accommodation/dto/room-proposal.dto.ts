import {
  PlacementChange,
  ProposalLayoutView,
  ProposalViewStatus,
} from '@/modules/accommodation/domain/proposal-view';
import { RunActorDto } from '@/modules/accommodation/dto/term-evaluation.dto';
import { EvaluationMode } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { TermRoomProposal } from '@/modules/accommodation/services/term-room-proposal.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const MODES: EvaluationMode[] = ['automatic', 'manual'];
const STATUSES: ProposalViewStatus[] = [
  'none',
  'running',
  'current',
  'stale',
  'failed',
  'timeout',
];
const PROPOSAL_STATUSES = ['solved', 'timeout', 'failed'] as const;
const CHANGES: PlacementChange[] = ['new', 'moved', 'removed', 'unchanged'];
const REASONS = ['N', 'K', 'H'] as const;
const WARNINGS = ['mixed', 'overCapacity'] as const;
const WISH_STATES = [
  'satisfied',
  'unsatisfied',
  'unplaced',
  'impossible',
] as const;

// ─── Mode ───────────────────────────────────────────────────────────────────

export class RoomProposalModeDto {
  @ApiProperty({
    enum: MODES,
    description:
      '`automatic`: a layout change of a term proposes its rooms after 10 s ' +
      'without another change · `manual` (a new event): only "Navrhnout ' +
      'pokoje" does. Neither changes a saved placement.',
  })
  @IsIn(MODES, { message: 'Vyberte automatický nebo ruční návrh pokojů.' })
  mode!: EvaluationMode;
}

// ─── Term proposal ──────────────────────────────────────────────────────────

export class ProposalRoomDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ description: 'Offered in the term; others stay empty.' })
  isAvailable!: boolean;

  @ApiProperty()
  baseBeds!: number;

  @ApiProperty()
  extraBeds!: number;

  @ApiProperty({
    type: [String],
    description: 'The people proposed for the room, in person order.',
  })
  personIds!: string[];

  @ApiProperty({
    enum: WARNINGS,
    nullable: true,
    description:
      'A locked room the proposal leaves as it is and adds nobody to: ' +
      'locked people of different values, or more than its beds.',
  })
  warning!: (typeof WARNINGS)[number] | null;
}

export class ProposalPersonDto {
  @ApiProperty({ format: 'uuid', description: 'The registration.' })
  id!: string;

  @ApiProperty({ description: 'Today’s name; not an input of the proposal.' })
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Effective value of the hard attribute; null without one.',
  })
  value!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The proposed room; null when unplaced or in a lock conflict.',
  })
  roomId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  savedRoomId!: string | null;

  @ApiProperty()
  isLocked!: boolean;

  @ApiProperty({
    enum: REASONS,
    nullable: true,
    description:
      'Why there is no room: `N` no room in the term · `K` every bed taken · ' +
      '`H` free beds only for another value or behind a lock.',
  })
  reason!: (typeof REASONS)[number] | null;

  @ApiProperty({ description: 'Locked to a room the term does not offer.' })
  isLockConflict!: boolean;

  @ApiProperty({
    enum: CHANGES,
    nullable: true,
    description:
      'Against the saved placement. Null: neither a saved nor a proposed room.',
  })
  change!: PlacementChange | null;
}

export class ProposalWishDto {
  @ApiProperty({ format: 'uuid' })
  from!: string;

  @ApiProperty({ format: 'uuid' })
  to!: string;

  @ApiProperty({ enum: WISH_STATES })
  state!: (typeof WISH_STATES)[number];
}

export class ProposalScoresDto {
  @ApiProperty({ description: 'U1' })
  placed!: number;

  @ApiProperty({ description: 'U2: placed outside the rooms of other terms.' })
  crossTerm!: number;

  @ApiProperty({
    type: [Number],
    description: 'U3: violations of each soft preference, in list order.',
  })
  preferences!: number[];

  @ApiProperty({ description: 'U4: unlocked saved placements changed.' })
  moves!: number;

  @ApiProperty({ description: 'U5' })
  extraBeds!: number;

  @ApiProperty({ description: 'U6' })
  rooms!: number;
}

export class ProposalSummaryDto {
  @ApiProperty()
  placed!: number;

  @ApiProperty()
  unplaced!: number;

  @ApiProperty()
  lockConflicts!: number;

  @ApiProperty({ description: 'Placed, without a saved placement.' })
  added!: number;

  @ApiProperty({ description: 'Placed elsewhere than saved.' })
  moved!: number;

  @ApiProperty({ description: 'Saved but unplaced: applying removes it.' })
  removed!: number;

  @ApiProperty({ description: 'Rooms with anyone in them.' })
  rooms!: number;

  @ApiProperty({ description: 'Extra beds taken.' })
  extraBeds!: number;
}

export class ProposalLayoutDto {
  @ApiProperty({
    description:
      'False when a level U2–U7 ran out of time: the layout is valid but ' +
      '"Rozdělení nemusí být nejlepší možné".',
  })
  isComplete!: boolean;

  @ApiProperty({
    type: [ProposalRoomDto],
    description: 'Every room of the event, in room order.',
  })
  rooms!: ProposalRoomDto[];

  @ApiProperty({
    type: [ProposalPersonDto],
    description: 'Every confirmed participant the proposal read, in order.',
  })
  people!: ProposalPersonDto[];

  @ApiProperty({ type: [ProposalWishDto] })
  wishes!: ProposalWishDto[];

  @ApiProperty({ type: ProposalScoresDto })
  scores!: ProposalScoresDto;

  @ApiProperty({ type: ProposalSummaryDto })
  summary!: ProposalSummaryDto;

  static from(layout: ProposalLayoutView): ProposalLayoutDto {
    return { ...layout };
  }
}

export class StoredProposalDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: PROPOSAL_STATUSES,
    description: '`timeout`: U1 did not finish · `failed`: nothing usable.',
  })
  status!: (typeof PROPOSAL_STATUSES)[number];

  @ApiProperty({
    type: RunActorDto,
    nullable: true,
    description: 'The organizer who asked for it; null when the system ran it.',
  })
  triggeredBy!: RunActorDto | null;

  @ApiProperty({ format: 'date-time' })
  startedAt!: string;

  @ApiProperty({ format: 'date-time' })
  finishedAt!: string;

  @ApiProperty()
  layoutVersion!: number;

  @ApiProperty({ description: 'It read the term’s current layout version.' })
  isCurrent!: boolean;

  @ApiProperty({
    type: ProposalLayoutDto,
    nullable: true,
    description: 'For a solved proposal.',
  })
  layout!: ProposalLayoutDto | null;
}

export class TermRoomProposalDto {
  @ApiProperty({ enum: MODES })
  mode!: EvaluationMode;

  @ApiProperty({
    enum: STATUSES,
    description:
      '`running`: a proposal runs or was asked for · `current` / `stale`: ' +
      'the last proposal matches / no longer matches the term · `failed` / ' +
      '`timeout`: the last one is not usable · `none`.',
  })
  status!: ProposalViewStatus;

  @ApiProperty({ description: 'Bumped by every layout change of the term.' })
  layoutVersion!: number;

  @ApiProperty({
    format: 'date-time',
    type: String,
    nullable: true,
    description: 'When the next proposal is due; null when none is scheduled.',
  })
  scheduledAt!: string | null;

  @ApiProperty({
    type: StoredProposalDto,
    nullable: true,
    description: 'The last proposal of the term, whatever its status.',
  })
  proposal!: StoredProposalDto | null;

  static from(view: TermRoomProposal): TermRoomProposalDto {
    const { proposal } = view;
    return {
      mode: view.mode,
      status: view.status,
      layoutVersion: view.layoutVersion,
      scheduledAt: view.scheduledAt?.toISOString() ?? null,
      proposal: proposal && {
        ...proposal,
        startedAt: proposal.startedAt.toISOString(),
        finishedAt: proposal.finishedAt.toISOString(),
        layout: proposal.layout && ProposalLayoutDto.from(proposal.layout),
      },
    };
  }
}
