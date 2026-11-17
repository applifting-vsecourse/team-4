import {
  RoomProposalModeDto,
  TermRoomProposalDto,
} from '@/modules/accommodation/dto/room-proposal.dto';
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
  constructor(private readonly proposals: TermRoomProposalService) {}

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
}
