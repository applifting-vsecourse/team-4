import {
  Gender,
  genderOtherFits,
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

describe('genderOtherFits', () => {
  it.each<[Gender | null, string | null, boolean]>([
    ['other', 'nebinární', true],
    ['other', null, true],
    ['female', null, true],
    [null, null, true],
    ['female', 'nebinární', false],
    ['undisclosed', 'nebinární', false],
    [null, 'nebinární', false],
  ])('for %s with %s is %s', (gender, genderOther, expected) => {
    expect(genderOtherFits(gender, genderOther)).toBe(expected);
  });
});
