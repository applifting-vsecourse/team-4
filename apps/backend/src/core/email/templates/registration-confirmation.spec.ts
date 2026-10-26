import * as React from 'react';
import {
  ConfirmationPayment,
  ConfirmationTerm,
  RegistrationConfirmation,
} from './registration-confirmation';
import { renderMarkup } from './render-markup';

const confirmed: ConfirmationTerm = {
  label: '1. turnus',
  startDate: '2026-07-06',
  endDate: '2026-07-12',
  priceMinor: 450_000,
  status: 'confirmed',
};
const waitlisted: ConfirmationTerm = {
  label: '2. turnus',
  startDate: '2026-07-13',
  endDate: '2026-07-19',
  priceMinor: 390_050,
  status: 'waitlisted',
};
const payment: ConfirmationPayment = {
  amountMinor: 450_000,
  variableSymbol: '2610190042',
  account: { prefix: '19', number: '2501234567', bankCode: '2010' },
  // 1 Nov 2026 23:30 UTC is already 2 Nov in Prague.
  reminderAt: new Date('2026-11-01T23:30:00Z'),
};

const render = (
  terms: ConfirmationTerm[],
  paying: ConfirmationPayment | null,
): Promise<string> =>
  renderMarkup(
    React.createElement(RegistrationConfirmation, {
      eventName: 'Letní tábor Jizerky',
      terms,
      selectedPriceMinor: terms.reduce((sum, t) => sum + t.priceMinor, 0),
      payment: paying,
      url: 'http://app.test/my-registrations/verify?token=abc',
    }),
  );

// Entities and non-breaking spaces made readable for plain-text assertions.
const text = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;|&#x27;/g, "'")
    .replace(/[\s\u00a0]+/g, ' ');

describe('RegistrationConfirmation', () => {
  it('shows a mixed result with its own status per term and both amounts', async () => {
    const out = text(await render([confirmed, waitlisted], payment));

    expect(out).toContain('Přihláška přijata');
    expect(out).toContain('Letní tábor Jizerky');
    expect(out).toContain(
      'Vaši přihlášku jsme přijali. Níže najdete stav účasti v jednotlivých termínech a případné platební instrukce.',
    );
    expect(out).toContain('1. turnus');
    expect(out).toContain('6. 7. – 12. 7. 2026');
    expect(out).toContain('Potvrzeno');
    expect(out).toContain('Náhradník');
    expect(out).toContain('Cena výběru 8 400,50 Kč');
    expect(out).toContain('K úhradě za potvrzené termíny 4 500 Kč');
    expect(out).toContain('Za tyto termíny nic neplatíte');
  });

  it('gives the stored account, symbol and the reminder date in Prague', async () => {
    const out = text(await render([confirmed], payment));

    expect(out).toContain('Platební instrukce');
    expect(out).toContain(
      'Datum připomenutí platby 2. 11. 2026 (Europe/Prague)',
    );
    expect(out).toContain('19-2501234567/2010');
    expect(out).toContain('2610190042');
    expect(out).not.toContain('Splatnost');
    expect(out).not.toContain('Nyní není co hradit');
  });

  it('says nothing is due when there is no obligation, without a request to pay', async () => {
    const out = text(await render([waitlisted], null));

    expect(out).toContain('Náhradník');
    expect(out).toContain('Nyní není co hradit.');
    expect(out).not.toContain('Platební instrukce');
    expect(out).not.toContain('K úhradě');
    expect(out).not.toContain('připomenutí');
    expect(out).not.toContain('Potvrzeno');
  });

  it('links the button to the magic link and states how long it lasts', async () => {
    const html = await render([confirmed], payment);

    expect(html).toContain(
      'href="http://app.test/my-registrations/verify?token=abc"',
    );
    expect(text(html)).toContain('Moje přihlášky');
    expect(text(html)).toContain('platí 15 minut');
  });

  it('opens with the akc.io icon next to the wordmark', async () => {
    const out = await render([confirmed], payment);
    expect(out).toMatch(
      /<img[^>]+src="http:\/\/app\.test\/apple-touch-icon\.png"[^>]*>[\s\S]*akc\.io/,
    );
  });

  it('leaves no unfilled placeholders', async () => {
    const out = await render([confirmed, waitlisted], payment);
    expect(out).not.toMatch(/\{\{|undefined|null|NaN/);
  });
});
