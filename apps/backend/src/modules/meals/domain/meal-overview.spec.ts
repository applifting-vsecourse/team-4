import {
  buildMealOverview,
  daysOf,
  MealParticipant,
} from '@/modules/meals/domain/meal-overview';

const term = {
  id: 't1',
  label: 'Červenec',
  startDate: '2026-07-30',
  endDate: '2026-08-02',
};

const person = (
  id: string,
  overrides: Partial<MealParticipant> = {},
): MealParticipant => ({
  registrationId: id,
  firstName: 'Jana',
  lastName: id,
  hasNoDietRestriction: false,
  diet: [],
  dietNote: '',
  ...overrides,
});

describe('daysOf', () => {
  it('includes both ends and crosses a month boundary', () => {
    expect(daysOf('2026-07-30', '2026-08-02')).toEqual([
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
  });

  it('is a single day for a one-day term', () => {
    expect(daysOf('2026-07-30', '2026-07-30')).toEqual(['2026-07-30']);
  });
});

describe('buildMealOverview', () => {
  it('counts no answer and "Bez omezení" as the basic meal', () => {
    const overview = buildMealOverview(term, [
      person('a'),
      person('b', { hasNoDietRestriction: true }),
    ]);
    expect(overview.days).toHaveLength(4);
    expect(overview.days[0]).toEqual({
      date: '2026-07-30',
      total: 2,
      categories: [{ diets: [], count: 2 }],
    });
  });

  it('makes a combination of diets one category and counts a person once', () => {
    const overview = buildMealOverview(term, [
      person('a', { diet: ['lactose_free', 'vegetarian'] }),
      person('b', { diet: ['vegetarian'] }),
      person('c'),
    ]);
    const day = overview.days[0];
    expect(day.categories).toEqual([
      { diets: [], count: 1 },
      { diets: ['vegetarian'], count: 1 },
      { diets: ['vegetarian', 'lactose_free'], count: 1 },
    ]);
    expect(day.categories.reduce((sum, c) => sum + c.count, 0)).toBe(day.total);
  });

  it('leaves out categories nobody belongs to', () => {
    const overview = buildMealOverview(term, [
      person('a', { diet: ['vegan'] }),
    ]);
    expect(overview.days[0].categories).toEqual([
      { diets: ['vegan'], count: 1 },
    ]);
  });

  it('lists notes with the participant and never reads them as a diet', () => {
    const overview = buildMealOverview(term, [
      person('b', { firstName: 'Petr', dietNote: ' bez ořechů ' }),
      person('a', { dietNote: 'vegan' }),
      person('c'),
    ]);
    expect(overview.notes.map((note) => note.registrationId)).toEqual([
      'a',
      'b',
    ]);
    expect(overview.notes[1].note).toBe('bez ořechů');
    expect(overview.days[0].categories).toEqual([{ diets: [], count: 3 }]);
  });

  it('has no categories without participants', () => {
    const overview = buildMealOverview(term, []);
    expect(overview.participants).toBe(0);
    expect(overview.days[0]).toEqual({
      date: '2026-07-30',
      total: 0,
      categories: [],
    });
  });
});
