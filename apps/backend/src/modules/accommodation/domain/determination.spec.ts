import {
  answerOf,
  determiningValues,
  needsDetermination,
  refuseDetermination,
} from '@/modules/accommodation/domain/determination';

const GENDER = {
  attribute: 'gender',
  nonDeterminingValues: ['other', 'undisclosed'],
};

describe('determination (spec v4 §4)', () => {
  it('offers the gender values a room can carry', () => {
    expect(determiningValues(GENDER)).toEqual(['female', 'male']);
    // No other question stores answers yet, so nothing can be determined for it.
    expect(
      determiningValues({ attribute: 'age', nonDeterminingValues: [] }),
    ).toEqual([]);
  });

  it('reads the gender answer only for the gender attribute', () => {
    expect(answerOf('gender', { gender: 'other' })).toBe('other');
    expect(answerOf('age', { gender: 'other' })).toBeNull();
  });

  it.each([
    [null, 'undisclosed', 'female', 'no_hard_attribute'],
    [GENDER, 'female', 'male', 'determination_not_needed'],
    [GENDER, 'undisclosed', 'other', 'value_invalid'],
    [GENDER, null, 'female', null],
    [GENDER, 'other', 'male', null],
  ] as const)(
    'with rules %o, answer %s and value %s refuses with %s',
    (hard, answer, value, refusal) => {
      expect(refuseDetermination(hard, answer, value)).toBe(refusal);
    },
  );

  it('needs a determination only with a hard attribute and no effective value', () => {
    expect(needsDetermination(null, null, null)).toBe(false);
    expect(needsDetermination(GENDER, 'male', null)).toBe(false);
    expect(needsDetermination(GENDER, null, null)).toBe(true);
    expect(
      needsDetermination(GENDER, null, { value: 'male', basedOnAnswer: null }),
    ).toBe(false);
  });
});
