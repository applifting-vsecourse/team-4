import { photoResponse } from '@/modules/events/controllers/photo-response';
import {
  PublicCatalogEventDto,
  PublicCatalogItemDto,
} from '@/modules/events/dto/event.dto';
import { EventPhotosService } from '@/modules/events/services/event-photos.service';
import { EventsService } from '@/modules/events/services/events.service';
import { Config } from '@/shared/config/config.service';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { publicEventSharePage } from './public-event-share-page';

// Same shape check as the registration link: anything else cannot match.
const PUBLIC_ID = /^[A-Za-z0-9_-]{1,32}$/;

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

@ApiTags('public events')
@Controller('public/catalog/events')
export class PublicCatalogController {
  constructor(
    private readonly events: EventsService,
    private readonly photos: EventPhotosService,
    private readonly config: Config,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'The public catalog of published events',
    description:
      'No sign-in. Published events of all organizations, nearest term first; ' +
      'an empty array when none is published. Never returns registrations, ' +
      "capacity, payment settings or the organizer's account contact.",
  })
  @ApiOkResponse({ type: [PublicCatalogItemDto] })
  async list(): Promise<PublicCatalogItemDto[]> {
    return (await this.events.listPublished()).map((item) =>
      PublicCatalogItemDto.from(item),
    );
  }

  @Get(':publicId')
  @ApiOperation({
    summary: 'The catalog detail of a published event',
    description:
      'No sign-in. Published events only, whatever their registration status; ' +
      '404 for an unpublished and an unknown event alike, with no event data. ' +
      'Never returns registrations, capacity, payment settings or the ' +
      "organizer's account contact.",
  })
  async get(
    @Param('publicId') publicId: string,
  ): Promise<PublicCatalogEventDto> {
    if (!PUBLIC_ID.test(publicId)) throw notAvailable();
    return PublicCatalogEventDto.from(await this.events.getPublished(publicId));
  }

  @Get(':publicId/share')
  @ApiOperation({
    summary: 'A shareable page with public event preview metadata',
    description:
      'No sign-in. Published events return title, description and an optional ' +
      'cover image for link previews, then send visitors to the public detail. ' +
      'Unpublished and unknown events go to the public catalog without event data.',
  })
  @ApiProduces('text/html')
  async share(
    @Param('publicId') publicId: string,
    @Res() response: Response,
  ): Promise<void> {
    if (!PUBLIC_ID.test(publicId)) {
      response
        .set('Cache-Control', 'no-store')
        .redirect(302, new URL('/events', this.config.frontendUrl).toString());
      return;
    }

    try {
      const event = await this.events.getPublished(publicId);
      const detailUrl = new URL(
        `/e/${encodeURIComponent(publicId)}`,
        this.config.frontendUrl,
      ).toString();
      const imageUrl = event.photoIds[0]
        ? new URL(
            `/api/public/catalog/events/${encodeURIComponent(publicId)}/photos/${encodeURIComponent(event.photoIds[0])}`,
            this.config.backendUrl,
          ).toString()
        : null;

      response
        .set('Cache-Control', 'no-store')
        .type('html')
        .send(
          publicEventSharePage({
            title: event.name,
            description: event.description,
            detailUrl,
            imageUrl,
          }),
        );
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      response
        .set('Cache-Control', 'no-store')
        .redirect(302, new URL('/events', this.config.frontendUrl).toString());
    }
  }

  @Get(':publicId/photos/:photoId')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOperation({
    summary: 'A photo of a published event',
    description: '404 for a photo of an unpublished or unknown event.',
  })
  async photo(
    @Param('publicId') publicId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    if (!PUBLIC_ID.test(publicId)) throw notAvailable();
    return photoResponse(
      await this.photos.readPublished(publicId, photoId),
      response,
      'public, max-age=300',
    );
  }
}
