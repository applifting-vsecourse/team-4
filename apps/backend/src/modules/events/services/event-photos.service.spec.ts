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
    findPhoto: jest.fn(),
    findPublishedPhoto: jest.fn(),
  };
  const events = { get: jest.fn() };
  const service = new EventPhotosService(
    repository as unknown as EventsRepository,
    events as unknown as EventsService,
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

  it('stores a PNG with its detected type', async () => {
    await service.add(scope, PNG);
    expect(event.insertPhoto).toHaveBeenCalledWith({
      contentType: 'image/png',
      data: PNG,
    });
  });

  it('rejects a file that is not a JPEG, PNG or WebP', async () => {
    await expect(
      service.add(scope, new TextEncoder().encode('<svg/>')),
    ).rejects.toMatchObject({ response: { code: 'photo_type' } });
    expect(event.insertPhoto).not.toHaveBeenCalled();
  });

  it('rejects a photo over 5 MB', async () => {
    const large = new Uint8Array(MAX_PHOTO_BYTES + 1);
    large.set(PNG);
    await expect(service.add(scope, large)).rejects.toMatchObject({
      response: { code: 'photo_too_large' },
    });
    expect(event.insertPhoto).not.toHaveBeenCalled();
  });

  it('rejects a fifth photo', async () => {
    events.get.mockResolvedValue(detailWithPhotos(4));
    await expect(service.add(scope, PNG)).rejects.toMatchObject({
      response: { code: 'photo_limit' },
    });
    expect(event.insertPhoto).not.toHaveBeenCalled();
  });

  it('rejects a photo when a concurrent upload reached the limit', async () => {
    event.photoCount.mockResolvedValue(4);
    await expect(service.add(scope, PNG)).rejects.toMatchObject({
      response: { code: 'photo_limit' },
    });
    expect(event.insertPhoto).not.toHaveBeenCalled();
  });

  it('removes a photo', async () => {
    event.deletePhoto.mockResolvedValue(true);
    await service.remove(scope, 'photo-1');
    expect(event.deletePhoto).toHaveBeenCalledWith('photo-1');
  });

  it('gives a photo of another event the same 404', async () => {
    event.deletePhoto.mockResolvedValue(false);
    await expect(service.remove(scope, 'photo-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('serves no photo of an unpublished or unknown event', async () => {
    repository.findPublishedPhoto.mockResolvedValue(null);
    await expect(
      service.readPublished('abc', 'photo-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
