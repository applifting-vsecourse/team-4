import {
  invalidPreferences,
  preferenceItems,
  readNeutralValues,
  samePreferences,
  softAttributeOptions,
  storedPreferences,
  WISHES_PREFERENCE,
} from '@/modules/accommodation/domain/room-proposal-preferences';

describe('the soft preferences of the room proposal (#389)', () => {
  it('offers gender unless it is the hard attribute', () => {
    expect(softAttributeOptions(null).map((o) => o.attribute)).toEqual([
      'gender',
    ]);
    expect(softAttributeOptions('gender')).toEqual([]);
  });

  it('accepts "Přání", gender with its answers and an empty list', () => {
    expect(invalidPreferences([])).toBeNull();
    expect(
      invalidPreferences([
        { id: 'gender', neutralValues: ['other', 'undisclosed'] },
        { id: WISHES_PREFERENCE },
      ]),
    ).toBeNull();
    expect(invalidPreferences([{ id: 'gender' }])).toBeNull();
  });

  it.each([
    [[{ id: 'shoe-size' }], 'Vyberte preference z nabídky.'],
    [
      [{ id: WISHES_PREFERENCE }, { id: WISHES_PREFERENCE }],
      'Každou preferenci lze v seznamu uvést jen jednou.',
    ],
    [
      [{ id: 'gender', neutralValues: ['tall'] }],
      'Neutrální hodnoty vyberte z odpovědí otázky.',
    ],
    [
      [{ id: 'gender', neutralValues: ['other', 'other'] }],
      'Neutrální hodnotu lze uvést jen jednou.',
    ],
    [
      [{ id: WISHES_PREFERENCE, neutralValues: ['other'] }],
      'Přání nemají neutrální hodnoty.',
    ],
  ])('refuses %j', (items, message) => {
    expect(invalidPreferences(items)).toBe(message);
  });

  it('stores the order and the neutral answers of the attributes only', () => {
    const stored = storedPreferences([
      { id: 'gender', neutralValues: ['undisclosed'] },
      { id: WISHES_PREFERENCE },
    ]);

    expect(stored).toEqual({
      softAttributes: ['gender', WISHES_PREFERENCE],
      softNeutralValues: { gender: ['undisclosed'] },
    });
    expect(
      preferenceItems(stored.softAttributes, stored.softNeutralValues),
    ).toEqual([
      { id: 'gender', neutralValues: ['undisclosed'] },
      { id: WISHES_PREFERENCE },
    ]);
  });

  it('compares the order of items but not of neutral answers', () => {
    const a = {
      softAttributes: ['gender', WISHES_PREFERENCE],
      softNeutralValues: { gender: ['other', 'undisclosed'] },
    };

    expect(
      samePreferences(a, {
        ...a,
        softNeutralValues: { gender: ['undisclosed', 'other'] },
      }),
    ).toBe(true);
    expect(
      samePreferences(a, {
        ...a,
        softAttributes: [WISHES_PREFERENCE, 'gender'],
      }),
    ).toBe(false);
    expect(
      samePreferences(a, { ...a, softNeutralValues: { gender: ['other'] } }),
    ).toBe(false);
  });

  it('reads only lists of answers from the stored JSON', () => {
    expect(readNeutralValues(null)).toEqual({});
    expect(readNeutralValues(['other'])).toEqual({});
    expect(
      readNeutralValues({ gender: ['other'], broken: 'x', mixed: [1] }),
    ).toEqual({ gender: ['other'] });
  });
});
