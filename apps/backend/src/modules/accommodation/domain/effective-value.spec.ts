import {
  effectiveValue,
  HardAttribute,
} from '@/modules/accommodation/domain/effective-value';

// The gender preset: "Jiná odpověď", "Nechci uvést" and no answer do not
// determine a room (spec v4 §1).
const GENDER: HardAttribute = {
  attribute: 'gender',
  nonDeterminingValues: ['Jiná odpověď', 'Nechci uvést'],
};

describe('effectiveValue', () => {
  it('is null for everyone without a hard attribute', () => {
    expect(effectiveValue(null, 'Žena', null)).toBeNull();
  });

  it('takes a determining answer and never guesses one (Př. 5)', () => {
    expect(effectiveValue(GENDER, 'Žena', null)).toBe('Žena');
    expect(effectiveValue(GENDER, 'Nechci uvést', null)).toBeNull();
    expect(effectiveValue(GENDER, 'Jiná odpověď', null)).toBeNull();
    expect(effectiveValue(GENDER, null, null)).toBeNull();
  });

  it('takes the organizer’s determination for the answer it was made on (Př. 5, Př. 6)', () => {
    const manual = {
      attribute: 'gender',
      value: 'Žena',
      basedOnAnswer: 'Nechci uvést',
    };
    expect(effectiveValue(GENDER, 'Nechci uvést', manual)).toBe('Žena');
    expect(
      effectiveValue(GENDER, null, {
        attribute: 'gender',
        value: 'Muž',
        basedOnAnswer: null,
      }),
    ).toBe('Muž');
  });

  it('drops the determination once the answer changes (Př. 5)', () => {
    const manual = {
      attribute: 'gender',
      value: 'Žena',
      basedOnAnswer: 'Nechci uvést',
    };
    expect(effectiveValue(GENDER, 'Žena', manual)).toBe('Žena');
    expect(effectiveValue(GENDER, 'Muž', manual)).toBe('Muž');
    expect(effectiveValue(GENDER, 'Jiná odpověď', manual)).toBeNull();
  });

  it('counts a determination only for the attribute it was made for (#485)', () => {
    const school = { attribute: 'q1', nonDeterminingValues: [] };
    expect(
      effectiveValue(school, null, {
        attribute: 'gender',
        value: 'female',
        basedOnAnswer: null,
      }),
    ).toBeNull();
    expect(
      effectiveValue(school, null, {
        attribute: 'q1',
        value: 'o1',
        basedOnAnswer: null,
      }),
    ).toBe('o1');
  });

  it('ignores a determination whose option no longer exists (#485)', () => {
    const school = {
      attribute: 'q1',
      nonDeterminingValues: [],
      values: ['o1', 'o2'],
    };
    const manual = { attribute: 'q1', value: 'o3', basedOnAnswer: null };
    expect(effectiveValue(school, null, manual)).toBeNull();
    expect(effectiveValue(school, null, { ...manual, value: 'o2' })).toBe('o2');
  });
});
