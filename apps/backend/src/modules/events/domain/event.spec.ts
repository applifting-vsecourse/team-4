import { findOpeningBlockers } from '@/modules/events/domain/event';

const ready = {
  name: 'Tábor',
  description: 'Popis',
  location: 'Podlesí',
  termCount: 1,
  paymentSettings: {
    bankAccountPrefix: '19',
    bankAccountNumber: '2000145399',
    bankCode: '0800',
    paymentReminderDays: 14,
  },
};

describe('findOpeningBlockers', () => {
  it('has nothing to report for a complete event', () => {
    expect(findOpeningBlockers(ready)).toEqual([]);
  });

  it('reports every missing part in a fixed order', () => {
    expect(
      findOpeningBlockers({
        name: ' ',
        description: '',
        location: ' ',
        termCount: 0,
        paymentSettings: null,
      }),
    ).toEqual(['name', 'description', 'location', 'terms', 'paymentSettings']);
  });

  it('requires a positive number of reminder days', () => {
    expect(
      findOpeningBlockers({
        ...ready,
        paymentSettings: { ...ready.paymentSettings, paymentReminderDays: 0 },
      }),
    ).toEqual(['paymentSettings']);
  });

  it('requires an account with a valid checksum', () => {
    expect(
      findOpeningBlockers({
        ...ready,
        paymentSettings: {
          ...ready.paymentSettings,
          bankAccountNumber: '2000145398',
        },
      }),
    ).toEqual(['paymentSettings']);
  });
});
