// Public presentation of an event on its catalog detail (F55).

/** Shown under "Kontakt na organizátora"; never the account's own contact. */
export type PublicContact = {
  name: string;
  email: string;
  phone: string | null;
};

export type PresentationInput = {
  description: string;
  conditions: string;
  /** Null when the organizer leaves the public contact empty. */
  contact: PublicContact | null;
};

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type PhotoType = 'image/jpeg' | 'image/png' | 'image/webp';

const startsWith = (bytes: Uint8Array, prefix: number[], offset = 0) =>
  prefix.every((byte, index) => bytes[offset + index] === byte);

/**
 * The type from the file's own signature, not from its name or the declared
 * content type, so only real JPEG, PNG and WebP images are stored and served.
 */
export const detectPhotoType = (bytes: Uint8Array): PhotoType | null => {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  return null;
};
