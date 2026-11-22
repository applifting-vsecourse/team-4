import { RoomPublicationDto } from '@/modules/accommodation/dto/room-publication.dto';
import { RoomPublicationService } from '@/modules/accommodation/services/room-publication.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// Publication of the room placements of one term to its participants (S4-02,
// #341). It is decided per term and places nobody: participants see the
// placements as they are when they look. 404 for a term outside the
// organizer's event.
@ApiTags('accommodation')
@ApiCookieAuth('better-auth.session_token')
@Controller(
  'organizations/:organizationId/events/:eventId/accommodation/terms/:termId/publication',
)
@UseGuards(AuthenticatedUserGuard)
export class RoomPublicationController {
  constructor(private readonly publication: RoomPublicationService) {}

  @Get()
  @ApiResponse({ status: 200, type: RoomPublicationDto })
  @ApiOperation({ summary: 'Whether the room placements are published' })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<RoomPublicationDto> {
    return RoomPublicationDto.from(
      await this.publication.get(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Put()
  @ApiResponse({ status: 200, type: RoomPublicationDto })
  @ApiOperation({
    summary: 'Publishes the room placements to the term’s participants',
    description: 'A published term keeps when it was published.',
  })
  async publish(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<RoomPublicationDto> {
    return RoomPublicationDto.from(
      await this.publication.publish(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Delete()
  @ApiResponse({ status: 200, type: RoomPublicationDto })
  @ApiOperation({
    summary: 'Takes the publication of the room placements back',
  })
  async unpublish(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<RoomPublicationDto> {
    return RoomPublicationDto.from(
      await this.publication.unpublish(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }
}
