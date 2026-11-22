import {
  AppliedProposalDto,
  ApplyProposalDto,
  TermWishesDto,
} from '@/modules/accommodation/dto/room-placements.dto';
import {
  RoomProposalModeDto,
  TermRoomProposalDto,
} from '@/modules/accommodation/dto/room-proposal.dto';
import { RoomPlacementsService } from '@/modules/accommodation/services/room-placements.service';
import { TermRoomProposalService } from '@/modules/accommodation/services/term-room-proposal.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// Ubytování → Návrh pokojů and Nastavení → Automatizace (#365, S4-11): the
// room proposal of a term. Every route is 404 for a foreign or missing
// organization, event or term.
@ApiTags('accommodation')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/accommodation')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RoomProposalController {
  constructor(
    private readonly proposals: TermRoomProposalService,
    private readonly placements: RoomPlacementsService,
  ) {}

  @Get('room-proposal-mode')
  @ApiOperation({ summary: 'Whether room proposals run automatically' })
  async mode(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<RoomProposalModeDto> {
    return {
      mode: await this.proposals.mode({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    };
  }

  @Put('room-proposal-mode')
  @ApiOperation({
    summary: 'Saves the room proposal mode',
    description:
      'It only decides what a later layout change does; it proposes ' +
      'nothing itself. Independent of the evaluation mode.',
  })
  async saveMode(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: RoomProposalModeDto,
  ): Promise<RoomProposalModeDto> {
    return {
      mode: await this.proposals.saveMode(
        { organizationId, ownerId: user.id, eventId },
        body.mode,
      ),
    };
  }

  @Get('terms/:termId/room-proposal')
  @ApiOperation({
    summary: 'The last room proposal of a term and whether it is current',
    description:
      'The layout against the saved placements, the unplaced with their ' +
      'reasons and the lock conflicts. Reading never proposes.',
  })
  async term(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<TermRoomProposalDto> {
    return TermRoomProposalDto.from(
      await this.proposals.term(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Post('terms/:termId/room-proposal')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Navrhnout pokoje: proposes the term now, in either mode',
    description:
      'Queued: the response shows `running`; read the term again for the ' +
      'proposal. A running proposal finishes first. No saved placement or ' +
      'participation changes.',
  })
  @ApiResponse({ status: 202, type: TermRoomProposalDto })
  async propose(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<TermRoomProposalDto> {
    return TermRoomProposalDto.from(
      await this.proposals.propose(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Post('terms/:termId/room-proposal/apply')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Použít návrh: saves the proposal’s rooms, all of it or nothing',
    description:
      'Every unlocked confirmed person gets the proposed room; an unplaced ' +
      'one loses theirs, a locked one stays. 409 `proposal_stale` when the ' +
      'term’s layout changed since the proposal. Never publishes and never ' +
      'changes participation.',
  })
  @ApiResponse({ status: 200, type: AppliedProposalDto })
  async apply(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Body() body: ApplyProposalDto,
  ): Promise<AppliedProposalDto> {
    return AppliedProposalDto.from(
      await this.placements.apply(
        { organizationId, ownerId: user.id, eventId },
        termId,
        body,
      ),
    );
  }

  @Get('terms/:termId/roommate-wishes')
  @ApiOperation({
    summary: 'The roommate wishes of the term and whether the rooms meet them',
    description:
      'Wishes between two participants confirmed in the term, with their ' +
      'state in the saved placements (#317).',
  })
  @ApiResponse({ status: 200, type: TermWishesDto })
  async wishes(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<TermWishesDto> {
    return TermWishesDto.from(
      await this.placements.wishes(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }
}
