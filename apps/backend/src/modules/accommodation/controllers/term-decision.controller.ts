import {
  ConfirmedProposalDto,
  ConfirmProposalDto,
  DecideParticipationDto,
  ParticipationDecidedDto,
} from '@/modules/accommodation/dto/term-decision.dto';
import { TermDecisionService } from '@/modules/accommodation/services/term-decision.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Přihlášky → Vyhodnocení → termín (S3-02): the organizer's decisions on
// participation. Every route is 404 for a foreign or missing event, term,
// run or registration.
@ApiTags('accommodation')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/accommodation/terms')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class TermDecisionController {
  constructor(private readonly decisions: TermDecisionService) {}

  @Post(':termId/confirmations')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Potvrdit všechny vhodné: confirms the proposal of the term',
    description:
      'Confirms every suitable person of the run, or nobody. Others stay ' +
      'pending or waitlisted; other terms are untouched. 409 ' +
      '`proposal_stale` when anything the proposal depends on changed, ' +
      '`proposal_unavailable`, `nothing_to_confirm`. Repeating a ' +
      '`submissionKey` returns the saved result and writes nothing.',
  })
  async confirmProposal(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Body() body: ConfirmProposalDto,
  ): Promise<ConfirmedProposalDto> {
    const result = await this.decisions.confirmProposal(
      { organizationId, ownerId: user.id, eventId },
      termId,
      body,
    );
    return { confirmed: result.people, isReplay: result.replay };
  }

  @Post(':termId/registrations/:registrationId/decision')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirms one person in the term or puts them on the waitlist',
    description:
      'Confirming checks the capacity and rules like the solver; without ' +
      'enough room 409 `no_capacity` or `incompatible_rooms`, and nothing is ' +
      'saved. A person without an effective value needs `determination` ' +
      'when confirmed (400 `determination_required`), saved with the ' +
      'decision or not at all. Repeating a `submissionKey` saves nothing.',
  })
  async decide(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() body: DecideParticipationDto,
  ): Promise<ParticipationDecidedDto> {
    return this.decisions.decide(
      { organizationId, ownerId: user.id, eventId },
      termId,
      registrationId,
      body,
    );
  }
}
