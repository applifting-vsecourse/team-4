import {
  DIET_CHOICES,
  DietChoice,
} from '@/modules/registrations/domain/registration-needs';

/** A confirmed participant of the term with the diet part of their needs (F63). */
export type MealParticipant = {
  registrationId: string;
  firstName: string;
  lastName: string;
  hasNoDietRestriction: boolean;
  diet: DietChoice[];
  dietNote: string;
};

/** The diets of one category; empty is the basic meal. */
export type MealCategory = { diets: DietChoice[]; count: number };

export type MealDay = {
  date: string;
  /** Strávníci of the day: each confirmed participant once. */
  total: number;
  /** Only the categories somebody belongs to, basic meal first. */
  categories: MealCategory[];
};

export type MealNote = {
  registrationId: string;
  firstName: string;
  lastName: string;
  note: string;
};

export class MealOverviewModel {
  constructor(
    public readonly term: {
      id: string;
      label: string;
      startDate: string;
      endDate: string;
    },
    public readonly participants: number,
    public readonly days: MealDay[],
    public readonly notes: MealNote[],
  ) {}
}

/** Every calendar day from `startDate` to `endDate`, both included. */
export const daysOf = (startDate: string, endDate: string): string[] => {
  const days: string[] = [];
  const end = Date.parse(`${endDate}T00:00:00Z`);
  for (
    let day = Date.parse(`${startDate}T00:00:00Z`);
    day <= end;
    day += 86_400_000
  ) {
    days.push(new Date(day).toISOString().slice(0, 10));
  }
  return days;
};

/**
 * The diets that decide the meal. "Bez omezení" and no answer are the basic
 * meal; the free text is never read as a diet.
 */
export const mealDiets = (participant: MealParticipant): DietChoice[] =>
  participant.hasNoDietRestriction
    ? []
    : DIET_CHOICES.filter((choice) => participant.diet.includes(choice));

/** A combination of diets is one category: `lactose_free+vegetarian` is one portion. */
const categoryKey = (diets: DietChoice[]): string => diets.join('+');

/**
 * Counts the confirmed participants per day and category. Without an
 * individual stay everybody eats on every day of the term (S5-05 refines
 * that), so each participant is counted once per day in exactly one category
 * and the categories always add up to the total.
 */
export const buildMealOverview = (
  term: MealOverviewModel['term'],
  participants: MealParticipant[],
): MealOverviewModel => {
  const counts = new Map<string, MealCategory>();
  for (const participant of participants) {
    const diets = mealDiets(participant);
    const key = categoryKey(diets);
    const category = counts.get(key) ?? { diets, count: 0 };
    category.count += 1;
    counts.set(key, category);
  }
  const order = (category: MealCategory): number[] =>
    DIET_CHOICES.map((choice) => (category.diets.includes(choice) ? 1 : 0));
  const categories = [...counts.values()].sort(
    (a, b) =>
      a.diets.length - b.diets.length ||
      order(b).join('').localeCompare(order(a).join('')),
  );
  const days = daysOf(term.startDate, term.endDate).map((date) => ({
    date,
    total: participants.length,
    categories: categories.map((category) => ({
      diets: [...category.diets],
      count: category.count,
    })),
  }));
  const notes = participants
    .filter((participant) => participant.dietNote.trim() !== '')
    .map((participant) => ({
      registrationId: participant.registrationId,
      firstName: participant.firstName,
      lastName: participant.lastName,
      note: participant.dietNote.trim(),
    }))
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, 'cs') ||
        a.firstName.localeCompare(b.firstName, 'cs'),
    );
  return new MealOverviewModel(term, participants.length, days, notes);
};
