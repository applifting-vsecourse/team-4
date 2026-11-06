import { Gender, genderOtherFits } from '@/modules/registrations/domain/gender';

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
