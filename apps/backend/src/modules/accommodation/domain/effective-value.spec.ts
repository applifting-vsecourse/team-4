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
    const manual = { value: 'Žena', basedOnAnswer: 'Nechci uvést' };
    expect(effectiveValue(GENDER, 'Nechci uvést', manual)).toBe('Žena');
    expect(
      effectiveValue(GENDER, null, { value: 'Muž', basedOnAnswer: null }),
    ).toBe('Muž');
  });

  it('drops the determination once the answer changes (Př. 5)', () => {
    const manual = { value: 'Žena', basedOnAnswer: 'Nechci uvést' };
    expect(effectiveValue(GENDER, 'Žena', manual)).toBe('Žena');
    expect(effectiveValue(GENDER, 'Muž', manual)).toBe('Muž');
    expect(effectiveValue(GENDER, 'Jiná odpověď', manual)).toBeNull();
  });
});
