import { ObjectStorage } from '@/core/storage/object-storage.service';
import { EventDetailModel } from '@/modules/events/domain/event';
import { MAX_PHOTO_BYTES } from '@/modules/events/domain/presentation';
import {
  EventsRepository,
  LockedEvent,
} from '@/modules/events/repositories/events.repository';
import { EventsService } from '@/modules/events/services/events.service';
import { NotFoundException } from '@nestjs/common';
import { EventPhotosService } from './event-photos.service';

const scope = { organizationId: 'org', ownerId: 'user-1', eventId: 'event' };
const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1,
]);

const detailWithPhotos = (count: number) =>
  ({
    photoIds: Array.from({ length: count }, (_, index) => `photo-${index}`),
  }) as EventDetailModel;

describe('EventPhotosService', () => {
  const event = {
    photoCount: jest.fn(),
    insertPhoto: jest.fn(),
    deletePhoto: jest.fn(),
  };
  const repository = {
    withLockedEvent: jest.fn(),
    findPhotoKey: jest.fn(),
    findPublishedPhotoKey: jest.fn(),
  };
  const events = { get: jest.fn() };
  const storage = { put: jest.fn(), get: jest.fn(), delete: jest.fn() };
  const service = new EventPhotosService(
    repository as unknown as EventsRepository,
    events as unknown as EventsService,
    storage as unknown as ObjectStorage,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    events.get.mockResolvedValue(detailWithPhotos(0));
    event.photoCount.mockResolvedValue(0);
    repository.withLockedEvent.mockImplementation(
      async (_scope, work: (e: LockedEvent) => Promise<unknown>) => ({
        found: true,
        result: await work(event as unknown as LockedEvent),
      }),
    );
  });

  it('stores a PNG with its detected type and records it', async () => {
    await service.add(scope, PNG);
    const [key, body, type] = storage.put.mock.calls[0] as [
      string,
      Uint8Array,
      string,
    ];
    expect(key).toMatch(/^events\/event\/photos\/[0-9a-f-]{36}$/);
    expect(body).toBe(PNG);
    expect(type).toBe('image/png');
    expect(event.insertPhoto).toHaveBeenCalledWith({
      objectKey: key,
      contentType: 'image/png',
      byteSize: PNG.byteLength,
    });
  });

  it('rejects a file that is not a JPEG, PNG or WebP before storing it', async () => {
    await expect(
      service.add(scope, new TextEncoder().encode('<svg/>')),
    ).rejects.toMatchObject({ response: { code: 'photo_type' } });
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects a photo over 5 MB before storing it', async () => {
    const large = new Uint8Array(MAX_PHOTO_BYTES + 1);
    large.set(PNG);
    await expect(service.add(scope, large)).rejects.toMatchObject({
      response: { code: 'photo_too_large' },
    });
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects a fifth photo without storing it', async () => {
    events.get.mockResolvedValue(detailWithPhotos(4));
    await expect(service.add(scope, PNG)).rejects.toMatchObject({
      response: { code: 'photo_limit' },
    });
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('removes the stored object when a concurrent upload reached the limit', async () => {
    event.photoCount.mockResolvedValue(4);
    await expect(service.add(scope, PNG)).rejects.toMatchObject({
      response: { code: 'photo_limit' },
    });
    const [key] = storage.put.mock.calls[0] as [string];
    expect(storage.delete).toHaveBeenCalledWith(key);
    expect(event.insertPhoto).not.toHaveBeenCalled();
  });

  it('removes a photo and its stored object', async () => {
    event.deletePhoto.mockResolvedValue('events/event/photos/a');
    await service.remove(scope, 'photo-1');
    expect(storage.delete).toHaveBeenCalledWith('events/event/photos/a');
  });

  it('gives a photo of another event the same 404', async () => {
    event.deletePhoto.mockResolvedValue(null);
    await expect(service.remove(scope, 'photo-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('serves no photo of an unpublished or unknown event', async () => {
    repository.findPublishedPhotoKey.mockResolvedValue(null);
    await expect(
      service.readPublished('abc', 'photo-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.get).not.toHaveBeenCalled();
  });
});
