import {
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
import { ParticipantNotificationListDto } from '@/modules/participant-notifications/dto/participant-notification.dto';
import { ParticipantNotificationsService } from '@/modules/participant-notifications/services/participant-notifications.service';
import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('participant notifications')
@ApiCookieAuth(PARTICIPANT_SESSION_COOKIE)
@ApiResponse({ status: 401, description: '`participant_session_required`' })
@Controller('participant/notifications')
@UseGuards(ParticipantSessionGuard)
export class ParticipantNotificationsController {
  constructor(
    private readonly notifications: ParticipantNotificationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Notifications of the own registrations',
    description:
      'Organizer decisions on terms, decided change requests and recorded ' +
      'payments of the signed-in account, newest first, without dismissed ones.',
  })
  @ApiResponse({ status: 200, type: ParticipantNotificationListDto })
  async list(
    @CurrentParticipant() participant: ParticipantIdentity,
  ): Promise<ParticipantNotificationListDto> {
    return ParticipantNotificationListDto.from(
      await this.notifications.list(participant),
    );
  }

  @Post('read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark every listed notification as read' })
  @ApiResponse({ status: 204 })
  async markAllRead(
    @CurrentParticipant() participant: ParticipantIdentity,
  ): Promise<void> {
    await this.notifications.markAllRead(participant);
  }

  @Post(':id/read')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Mark one notification as read',
    description:
      '404 `notification_not_found` for a notification of another ' +
      'participant, the same as a missing one.',
  })
  @ApiResponse({ status: 204 })
  async markRead(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notifications.markRead(participant, id);
  }

  @Post(':id/dismiss')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Hide one notification for good',
    description:
      'It also counts as read; the registration and payment stay unchanged. ' +
      '404 `notification_not_found` for a notification of another participant.',
  })
  @ApiResponse({ status: 204 })
  async dismiss(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notifications.dismiss(participant, id);
  }
}
