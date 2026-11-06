export type TransportChoice = 'own' | 'shared';
export type DietChoice =
  'vegetarian' | 'vegan' | 'gluten_free' | 'lactose_free';

export const TRANSPORT_CHOICES: readonly TransportChoice[] = ['own', 'shared'];
export const DIET_CHOICES: readonly DietChoice[] = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'lactose_free',
];

export const TRANSPORT_NOTE_MAX = 500;
export const DIET_NOTE_MAX = 500;
export const HEALTH_MAX = 2000;

/**
 * Transport, diet and health (F63), once for the whole registration. Every
 * part is optional: empty text and no choice mean "not provided", which is
 * never the same as an explicit "Bez omezení".
 */
export type RegistrationNeeds = {
  transport: TransportChoice | null;
  transportNote: string;
  /** Explicit "Bez omezení"; never together with a diet choice. */
  hasNoDietRestriction: boolean;
  /** In the order of DIET_CHOICES, without repeats. */
  diet: DietChoice[];
  dietNote: string;
  health: string;
};

export const NO_NEEDS: RegistrationNeeds = {
  transport: null,
  transportNote: '',
  hasNoDietRestriction: false,
  diet: [],
  dietNote: '',
  health: '',
};

/** Trimmed text and the diet in a fixed order, so equal input compares equal. */
export const normalizeNeeds = (
  needs: RegistrationNeeds,
): RegistrationNeeds => ({
  transport: needs.transport,
  transportNote: needs.transportNote.trim(),
  hasNoDietRestriction: needs.hasNoDietRestriction,
  diet: DIET_CHOICES.filter((choice) => needs.diet.includes(choice)),
  dietNote: needs.dietNote.trim(),
  health: needs.health.trim(),
});

export const sameNeeds = (
  a: RegistrationNeeds,
  b: RegistrationNeeds,
): boolean =>
  JSON.stringify(normalizeNeeds(a)) === JSON.stringify(normalizeNeeds(b));

/** The needs columns of a registration row, as the API returns them. */
export const needsOf = (row: RegistrationNeeds): RegistrationNeeds => ({
  transport: row.transport,
  transportNote: row.transportNote,
  hasNoDietRestriction: row.hasNoDietRestriction,
  diet: row.diet,
  dietNote: row.dietNote,
  health: row.health,
});

export const needsSelect = {
  transport: true,
  transportNote: true,
  hasNoDietRestriction: true,
  diet: true,
  dietNote: true,
  health: true,
} as const;
