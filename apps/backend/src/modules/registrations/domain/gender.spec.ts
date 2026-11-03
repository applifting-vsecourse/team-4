import {
  Gender,
  requiresManualAccommodation,
} from '@/modules/registrations/domain/gender';

describe('requiresManualAccommodation', () => {
  it.each<[Gender | null, boolean]>([
    ['female', false],
    ['male', false],
    ['other', true],
    ['undisclosed', true],
    [null, true],
  ])('for %s is %s', (gender, expected) => {
    expect(requiresManualAccommodation(gender)).toBe(expected);
  });
});
