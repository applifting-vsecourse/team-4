import { randomUUID } from 'node:crypto';
import {
  ObjectStorage,
  StoredObject,
} from '@/core/storage/object-storage.service';
import { EventDetailModel } from '@/modules/events/domain/event';
import {
  detectPhotoType,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
} from '@/modules/events/domain/presentation';
import {
  EventScope,
  EventsRepository,
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
 * Photos of the public presentation (F55). The bytes go to object storage
 * first and the row is written under the event row lock, so the limit holds
 * under concurrent uploads; a failed write removes the stored object again.
 * Photos stay editable after the first opening.
 */
@Injectable()
export class EventPhotosService {
  constructor(
    private readonly repository: EventsRepository,
    private readonly events: EventsService,
    private readonly storage: ObjectStorage,
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
    // Fail fast before storing anything; the locked check below is the guarantee.
    const current = await this.events.get(scope);
    if (current.photoIds.length >= MAX_PHOTOS) throw tooMany();

    const objectKey = `events/${scope.eventId}/photos/${randomUUID()}`;
    await this.storage.put(objectKey, bytes, contentType);
    try {
      const outcome = await this.repository.withLockedEvent(
        scope,
        async (event) => {
          if ((await event.photoCount()) >= MAX_PHOTOS) throw tooMany();
          await event.insertPhoto({
            objectKey,
            contentType,
            byteSize: bytes.byteLength,
          });
        },
      );
      if (!outcome.found) throw notAvailable();
    } catch (error) {
      await this.storage.delete(objectKey);
      throw error;
    }
    return this.events.get(scope);
  }

  async remove(scope: EventScope, photoId: string): Promise<EventDetailModel> {
    const outcome = await this.repository.withLockedEvent(scope, (event) =>
      event.deletePhoto(photoId),
    );
    if (!outcome.found || outcome.result === null) throw notAvailable();
    await this.storage.delete(outcome.result);
    return this.events.get(scope);
  }

  /** A photo of the caller's event, for the organizer's preview. */
  async read(scope: EventScope, photoId: string): Promise<StoredObject> {
    const key = await this.repository.findPhotoKey(scope, photoId);
    if (!key) throw notAvailable();
    return this.storage.get(key);
  }

  /** A photo of a published event; anything else is the same 404. */
  async readPublished(
    publicId: string,
    photoId: string,
  ): Promise<StoredObject> {
    const key = await this.repository.findPublishedPhotoKey(publicId, photoId);
    if (!key) throw notAvailable();
    return this.storage.get(key);
  }
}

const tooMany = (): ConflictException =>
  new ConflictException({
    statusCode: 409,
    code: 'photo_limit',
    message: `Akce může mít nejvýše ${MAX_PHOTOS} fotky.`,
  });
