import { EventDetailModel } from '@/modules/events/domain/event';
import {
  detectPhotoType,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
} from '@/modules/events/domain/presentation';
import {
  EventScope,
  EventsRepository,
  StoredPhoto,
} from '@/modules/events/repositories/events.repository';
import { EventsService } from '@/modules/events/services/events.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

/**
 * Photos of the public presentation (F55). The bytes are stored in the
 * database row, written under the event row lock so the limit holds under
 * concurrent uploads. Photos stay editable after the first opening.
 */
@Injectable()
export class EventPhotosService {
  constructor(
    private readonly repository: EventsRepository,
    private readonly events: EventsService,
  ) {}

  async add(scope: EventScope, bytes: Uint8Array): Promise<EventDetailModel> {
    if (bytes.byteLength > MAX_PHOTO_BYTES) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'photo_too_large',
        message: 'Fotka může mít nejvýše 5 MB.',
      });
    }
    const contentType = detectPhotoType(bytes);
    if (!contentType) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'photo_type',
        message: 'Nahrajte fotku ve formátu JPEG, PNG nebo WebP.',
      });
    }
    // Fail fast before writing anything; the locked check below is the guarantee.
    const current = await this.events.get(scope);
    if (current.photoIds.length >= MAX_PHOTOS) throw tooMany();

    // Copy into a plain ArrayBuffer-backed array, as Prisma's Bytes requires.
    const data = new Uint8Array(bytes);
    const outcome = await this.repository.withLockedEvent(
      scope,
      async (event) => {
        if ((await event.photoCount()) >= MAX_PHOTOS) throw tooMany();
        await event.insertPhoto({ contentType, data });
      },
    );
    if (!outcome.found) throw notAvailable();
    return this.events.get(scope);
  }

  async remove(scope: EventScope, photoId: string): Promise<EventDetailModel> {
    const outcome = await this.repository.withLockedEvent(scope, (event) =>
      event.deletePhoto(photoId),
    );
    if (!outcome.found || !outcome.result) throw notAvailable();
    return this.events.get(scope);
  }

  /** A photo of the caller's event, for the organizer's preview. */
  async read(scope: EventScope, photoId: string): Promise<StoredPhoto> {
    const photo = await this.repository.findPhoto(scope, photoId);
    if (!photo) throw notAvailable();
    return photo;
  }

  /** A photo of a published event; anything else is the same 404. */
  async readPublished(publicId: string, photoId: string): Promise<StoredPhoto> {
    const photo = await this.repository.findPublishedPhoto(publicId, photoId);
    if (!photo) throw notAvailable();
    return photo;
  }
}

const tooMany = (): ConflictException =>
  new ConflictException({
    statusCode: 409,
    code: 'photo_limit',
    message: `Akce může mít nejvýše ${MAX_PHOTOS} fotky.`,
  });
