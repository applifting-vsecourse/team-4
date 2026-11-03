import { checkQrPayment } from '@/modules/registrations/domain/qr-payment';

describe('checkQrPayment', () => {
  it('accepts the whole debt and a smaller part', () => {
    expect(checkQrPayment(240_000, 240_000)).toBe('ok');
    expect(checkQrPayment(240_000, 1)).toBe('ok');
  });

  it('rejects an amount above the current debt', () => {
    expect(checkQrPayment(90_000, 240_000)).toBe('debt_reduced');
  });

  it('has nothing to pay at a zero balance or an overpayment', () => {
    expect(checkQrPayment(0, 100)).toBe('nothing_to_pay');
    expect(checkQrPayment(-50_000, 100)).toBe('nothing_to_pay');
  });
});
