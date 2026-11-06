import {
  ParticipantUpdatePayload,
  UpdateTerm,
} from '@/modules/registrations/domain/participant-update';
import * as React from 'react';
import {
  ParticipantUpdate,
  participantUpdateSubject,
} from './participant-update';
import { renderMarkup } from './render-markup';

const confirmed: UpdateTerm = {
  label: '1. turnus',
  startDate: '2027-07-04',
  endDate: '2027-07-11',
  status: 'confirmed',
};
const waitlisted: UpdateTerm = {
  label: '2. turnus',
  startDate: '2027-07-11',
  endDate: '2027-07-18',
  status: 'waitlisted',
};

const update = (
  overrides: Partial<ParticipantUpdatePayload> = {},
  payment: Partial<ParticipantUpdatePayload['payment']> = {},
): ParticipantUpdatePayload => ({
  reason: 'evaluation',
  eventName: 'Letní tábor Lipnice 2027',
  organizer: {
    name: 'Spolek Lipnice',
    email: 'tabor@example.cz',
    phone: '+420 603 214 587',
  },
  terms: [confirmed, waitlisted],
  proposedTerms: null,
  changes: [],
  hasMagicLink: true,
  payment: {
    recorded: null,
    receivedMinor: 0,
    balanceMinor: 300_000,
    bank: {
      prefix: null,
      number: '2301234567',
      bankCode: '2010',
      variableSymbol: '2027014',
      reminderAt: '2027-06-14T22:00:00.000Z',
    },
    paymentToken: 'tok',
    ...payment,
  },
  ...overrides,
});

const render = (value: ParticipantUpdatePayload): Promise<string> =>
  renderMarkup(
    React.createElement(ParticipantUpdate, {
      update: value,
      url: 'http://app.test/my-registrations/verify?token=abc',
      payUrl: 'http://app.test/platba/tok',
    }),
  );

const text = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;|&#x27;/g, "'")
    .replace(/[\s\u00a0]+/g, ' ');

describe('ParticipantUpdate', () => {
  it('shows each term with its own status, the debt, the bank details and a QR code', async () => {
    const html = await render(update());
    const out = text(html);

    expect(out).toContain('Výsledek vyhodnocení');
    expect(out).toContain('1. turnus');
    expect(out).toContain('Potvrzeno');
    expect(out).toContain('Náhradník');
    expect(out).toContain('Zbývá uhradit 3 000 Kč');
    expect(out).toContain('2301234567/2010');
    expect(out).toContain('2027014');
    expect(out).toContain('Datum připomenutí platby');
    expect(html).toContain('<svg');
    expect(html).toContain('aria-label="QR kód pro platbu"');
    expect(out).not.toMatch(/undefined|null|\{\{/);
  });

  it('asks for no payment when every term is on the waitlist', async () => {
    const out = text(
      await render(
        update(
          { terms: [waitlisted] },
          { balanceMinor: 0, bank: update().payment.bank },
        ),
      ),
    );

    expect(out).not.toContain('Platební údaje');
    expect(out).not.toContain('Platby');
    expect(out).not.toContain('Vše je uhrazeno');
  });

  it('confirms a payment that settles the debt', async () => {
    const html = await render(
      update(
        { reason: 'paymentRecorded', terms: [confirmed] },
        {
          recorded: { amountMinor: 450_000, receivedOn: '2026-10-28' },
          receivedMinor: 750_000,
          balanceMinor: 0,
        },
      ),
    );
    const out = text(html);

    expect(out).toContain('Přijali jsme vaši platbu');
    expect(out).toContain('Přijatá platba 4 500 Kč');
    expect(out).toContain('Celkem přijato 7 500 Kč');
    expect(out).toContain('Vše je uhrazeno');
    expect(out).not.toContain('Platební údaje');
    expect(html).not.toContain('<svg');
  });

  it('names an overpayment without promising a refund', async () => {
    const out = text(
      await render(
        update(
          { reason: 'paymentRecorded' },
          {
            recorded: { amountMinor: 500_000, receivedOn: '2026-10-28' },
            receivedMinor: 800_000,
            balanceMinor: -50_000,
          },
        ),
      ),
    );

    expect(out).toContain('Přeplatek 500 Kč');
    expect(out).toContain('domluvte s organizátorem');
    expect(out).not.toMatch(/vrát|refund/i);
    expect(out).not.toContain('Platební údaje');
  });

  it('keeps a proposal apart from what still holds and promises nothing', async () => {
    const out = text(
      await render(
        update({
          reason: 'requestReceived',
          terms: [confirmed],
          proposedTerms: [confirmed, { ...waitlisted, status: 'pending' }],
        }),
      ),
    );

    expect(out).toContain('Žádost čeká na schválení');
    expect(out).toContain('Stále platí');
    expect(out).toContain('Navrhovaná změna');
    expect(out).toContain('Čeká na schválení');
    expect(out).not.toContain('Platební údaje');
  });

  it('lists the values a request would change, before and after', async () => {
    const out = text(
      await render(
        update({
          reason: 'requestReceived',
          changes: [
            {
              label: 'Telefon',
              original: '+420600000000',
              proposed: '+420731987654',
            },
          ],
        }),
      ),
    );

    expect(out).toContain('Navrhované změny údajů');
    expect(out).toContain('Telefon');
    expect(out).toContain('Dosud: +420600000000');
    expect(out).toContain('Nově: +420731987654');
  });

  it('leaves out the sign-in link text when the contact differs from the account', async () => {
    const out = text(await render(update({ hasMagicLink: false })));

    expect(out).toContain('Tento e-mail neobsahuje přihlašovací odkaz');
    expect(out).not.toContain('Přihlašovací odkaz platí 15 minut');
  });

  it('puts the event in the subject', () => {
    expect(participantUpdateSubject('paymentRecorded', 'Tábor')).toBe(
      'akc.io — platba přijata: Tábor',
    );
  });
});
