import { StoredPhoto } from '@/modules/events/repositories/events.repository';
import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

/** Serves a stored photo with the type detected at upload, never sniffed. */
export const photoResponse = (
  photo: StoredPhoto,
  response: Response,
  cacheControl: string,
): StreamableFile => {
  response.setHeader('Cache-Control', cacheControl);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return new StreamableFile(Buffer.from(photo.body), {
    type: photo.contentType,
    length: photo.body.byteLength,
  });
};
