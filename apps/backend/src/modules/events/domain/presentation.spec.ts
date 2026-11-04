import { detectPhotoType } from '@/modules/events/domain/presentation';

const bytes = (...values: number[]) => Uint8Array.from(values);

describe('detectPhotoType', () => {
  it('recognizes JPEG, PNG and WebP by their signature', () => {
    expect(detectPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(
      detectPhotoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe('image/png');
    expect(
      detectPhotoType(
        bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50),
      ),
    ).toBe('image/webp');
  });

  it('rejects anything else, whatever the file claims to be', () => {
    expect(detectPhotoType(new TextEncoder().encode('<svg></svg>'))).toBeNull();
    expect(detectPhotoType(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull();
    expect(
      detectPhotoType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x41, 0x56)),
    ).toBeNull();
    expect(detectPhotoType(bytes())).toBeNull();
  });
});
