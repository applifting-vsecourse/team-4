import { photoResponse } from '@/modules/events/controllers/photo-response';
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
} from '@/modules/events/domain/presentation';
import { EventDetailDto } from '@/modules/events/dto/event.dto';
import { EventPhotosService } from '@/modules/events/services/event-photos.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('events')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/photos')
@UseGuards(AuthenticatedUserGuard)
export class EventPhotosController {
  constructor(private readonly photos: EventPhotosService) {}

  @Post()
  // One byte over the limit, so the service answers with its own message.
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_PHOTO_BYTES + 1, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Add a photo to the public presentation',
    description:
      `JPEG, PNG or WebP by content, at most 5 MB and ${MAX_PHOTOS} photos per event. ` +
      '400 `photo_type` / `photo_too_large`, 409 `photo_limit`. Allowed at any ' +
      'time. Returns the event.',
  })
  async add(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<EventDetailDto> {
    if (!file) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'photo_type',
        message: 'Nahrajte fotku ve formátu JPEG, PNG nebo WebP.',
      });
    }
    return EventDetailDto.from(
      await this.photos.add(
        { organizationId, ownerId: user.id, eventId },
        new Uint8Array(file.buffer),
      ),
    );
  }

  @Delete(':photoId')
  @ApiOperation({
    summary: 'Remove a photo from the public presentation',
    description: '404 for a photo of another event. Returns the event.',
  })
  async remove(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.photos.remove(
        { organizationId, ownerId: user.id, eventId },
        photoId,
      ),
    );
  }

  @Get(':photoId')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOperation({
    summary: 'A photo of an own event, also unpublished',
    description: '404 for a photo of a foreign or missing event.',
  })
  async read(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return photoResponse(
      await this.photos.read(
        { organizationId, ownerId: user.id, eventId },
        photoId,
      ),
      response,
      'private, no-store',
    );
  }
}
