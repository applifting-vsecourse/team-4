import {
  RegistrationChangeDto,
  RegistrationChangeListDto,
} from '@/modules/registrations/dto/registration-change.dto';
import { RegistrationChangesService } from '@/modules/registrations/services/registration-changes.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// The organizer's side of the participants' change requests (F35-2a).
@ApiTags('registration changes')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId')
@UseGuards(AuthenticatedUserGuard)
export class RegistrationChangesController {
  constructor(private readonly changes: RegistrationChangesService) {}

  @Get('change-requests')
  @ApiOperation({
    summary: 'Requests waiting for approval, oldest first',
    description: '404 for a foreign or missing event.',
  })
  async listPending(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<RegistrationChangeListDto> {
    return RegistrationChangeListDto.from(
      await this.changes.listPending({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    );
  }

  @Get('registrations/:registrationId/changes')
  @ApiOperation({
    summary: 'Changes of one registration, newest first',
    description:
      'Original and proposed values of a waiting, approved, rejected or ' +
      'executed change. 404 for a registration of another event or organization.',
  })
  async list(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<RegistrationChangeListDto> {
    return RegistrationChangeListDto.from(
      await this.changes.listManaged(
        { organizationId, ownerId: user.id, eventId },
        registrationId,
      ),
    );
  }

  @Post('registrations/:registrationId/changes/:changeId/approve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Approves a request and makes the change once',
    description:
      'The capacity is checked again. 409 `waitlist_consent_required` when ' +
      'the move now ends on the waitlist and the participant has not agreed; ' +
      '409 `change_already_decided` after a rejection. Approving twice ' +
      'returns the approved request without changing anything.',
  })
  async approve(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Param('changeId', ParseUUIDPipe) changeId: string,
  ): Promise<RegistrationChangeDto> {
    return RegistrationChangeDto.from(
      await this.changes.approve(
        { organizationId, ownerId: user.id, eventId },
        registrationId,
        changeId,
      ),
    );
  }

  @Post('registrations/:registrationId/changes/:changeId/reject')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rejects a request; the registration stays as it is',
    description:
      '409 `change_already_decided` after an approval. Rejecting twice ' +
      'returns the rejected request.',
  })
  async reject(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Param('changeId', ParseUUIDPipe) changeId: string,
  ): Promise<RegistrationChangeDto> {
    return RegistrationChangeDto.from(
      await this.changes.reject(
        { organizationId, ownerId: user.id, eventId },
        registrationId,
        changeId,
      ),
    );
  }
}
