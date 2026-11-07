import {
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
import {
  ParticipantRegistrationDetailDto,
  ParticipantRegistrationListDto,
} from '@/modules/registrations/dto/participant-registration.dto';
import {
  ChangePreviewDto,
  ChangeProposalDto,
  RegistrationChangeDto,
  RegistrationChangeListDto,
  SubmitChangeDto,
  SubmittedChangeDto,
} from '@/modules/registrations/dto/registration-change.dto';
import { ParticipantRegistrationsService } from '@/modules/registrations/services/participant-registrations.service';
import { RegistrationChangesService } from '@/modules/registrations/services/registration-changes.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
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

// The participant's own registrations (S2-14); S2-13 owns the session.
@ApiTags('participant registrations')
@ApiCookieAuth(PARTICIPANT_SESSION_COOKIE)
@Controller('participant/registrations')
@UseGuards(ParticipantSessionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ParticipantRegistrationsController {
  constructor(
    private readonly registrations: ParticipantRegistrationsService,
    private readonly changes: RegistrationChangesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'All registrations of the signed-in participant',
    description:
      'Read from the verified session only; no e-mail or id in the request ' +
      'can widen it. 401 `participant_session_required` without a session.',
  })
  @ApiResponse({ status: 200, type: ParticipantRegistrationListDto })
  async list(
    @CurrentParticipant() participant: ParticipantIdentity,
  ): Promise<ParticipantRegistrationListDto> {
    return ParticipantRegistrationListDto.from(
      await this.registrations.list(participant.accountId),
    );
  }

  @Get(':registrationId')
  @ApiOperation({
    summary: 'One own registration with its payments',
    description:
      '404 `registration_unavailable` for a registration of another ' +
      'participant, the same as a missing one.',
  })
  @ApiResponse({ status: 200, type: ParticipantRegistrationDetailDto })
  async get(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<ParticipantRegistrationDetailDto> {
    return ParticipantRegistrationDetailDto.fromDetail(
      await this.registrations.get(participant.accountId, registrationId),
      await this.registrations.availableTerms(registrationId),
    );
  }

  @Get(':registrationId/changes')
  @ApiOperation({
    summary: 'Changes of an own registration, newest first',
    description:
      'Executed, waiting, approved and rejected. 404 `registration_unavailable` ' +
      'for a registration of another participant.',
  })
  @ApiResponse({ status: 200, type: RegistrationChangeListDto })
  async listChanges(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<RegistrationChangeListDto> {
    return RegistrationChangeListDto.from(
      await this.changes.listOwn(participant.accountId, registrationId),
    );
  }

  @Post(':registrationId/changes/preview')
  @HttpCode(200)
  @ApiOperation({
    summary: 'What a change would do, without making it',
    description:
      'Original and proposed values, the resulting participation of each ' +
      'term, price and balance, and whether the organizer must approve. ' +
      '400 for an invalid proposal, 409 `change_pending` while a request waits.',
  })
  @ApiResponse({ status: 200, type: ChangePreviewDto })
  async preview(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() proposal: ChangeProposalDto,
  ): Promise<ChangePreviewDto> {
    return ChangePreviewDto.from(
      await this.changes.preview(
        participant.accountId,
        registrationId,
        proposal,
      ),
    );
  }

  @Post(':registrationId/changes')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Makes a change, or files it as a request for approval',
    description:
      'The approval threshold is checked again here. A moved-to term waits ' +
      "for the organizer's decision. 409: `registration_stale` (changed " +
      'meanwhile), `approval_changed`, `release_consent_required` (the move ' +
      'gives up a confirmed place), `change_pending`. `approval_changed` and ' +
      '`release_consent_required` carry a fresh `preview`.',
  })
  @ApiResponse({ status: 200, type: SubmittedChangeDto })
  async submit(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() body: SubmitChangeDto,
  ): Promise<SubmittedChangeDto> {
    const { expectedVersion, expectsApproval, ...proposal } = body;
    const result = await this.changes.submit(
      participant.accountId,
      registrationId,
      { proposal, expectedVersion, expectsApproval },
    );
    return {
      outcome: result.outcome,
      change: RegistrationChangeDto.from(result.change),
    };
  }
}
