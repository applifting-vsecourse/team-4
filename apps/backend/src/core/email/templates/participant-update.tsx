import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import {
  balanceKind,
  ParticipantUpdatePayload,
  ParticipantUpdateReason,
  UpdateChange,
  UpdateTerm,
} from '@/modules/registrations/domain/participant-update';
import { LOGO_CID } from '../brand-logo';
import { EmailBrand } from './email-brand';
import {
  formatBankAccount,
  formatDateRange,
  formatMoney,
  formatPragueDate,
} from './format';

/** Fixed copy per reason; the event name is the only variable (F45-1). */
export const PARTICIPANT_UPDATE_COPY: Record<
  ParticipantUpdateReason,
  { subject: string; heading: string; sentence: string }
> = {
  evaluation: {
    subject: 'výsledek vyhodnocení přihlášek',
    heading: 'Výsledek vyhodnocení',
    sentence:
      'Organizátor vyhodnotil přihlášky. Za termíny, ve kterých jste náhradník, nic neplatíte.',
  },
  waitlistConfirmed: {
    subject: 'místo potvrzeno',
    heading: 'Uvolnilo se místo',
    sentence:
      'V jednom z vašich termínů se uvolnilo místo a vaše účast je nyní potvrzená.',
  },
  organizerChange: {
    subject: 'změna přihlášky',
    heading: 'Organizátor upravil vaši přihlášku',
    sentence: 'Organizátor upravil vaši přihlášku. Níže je její aktuální stav.',
  },
  balanceChanged: {
    subject: 'nová částka k úhradě',
    heading: 'Změnila se částka k úhradě',
    sentence: 'Po úpravě vaší přihlášky se změnila částka k úhradě.',
  },
  requestReceived: {
    subject: 'žádost o změnu přijata',
    heading: 'Žádost čeká na schválení',
    sentence:
      'Vaši žádost o změnu jsme přijali a rozhodne o ní organizátor. Do té doby platí dosavadní přihláška.',
  },
  requestApproved: {
    subject: 'žádost schválena',
    heading: 'Žádost byla schválena',
    sentence: 'Organizátor schválil vaši žádost o změnu. Změna je provedená.',
  },
  requestRejected: {
    subject: 'žádost zamítnuta',
    heading: 'Žádost byla zamítnuta',
    sentence:
      'Organizátor zamítl vaši žádost o změnu. Přihláška zůstává beze změny.',
  },
  paymentRecorded: {
    subject: 'platba přijata',
    heading: 'Přijali jsme vaši platbu',
    sentence: 'Zaznamenali jsme vaši platbu.',
  },
};

export const participantUpdateSubject = (
  reason: ParticipantUpdateReason,
  eventName: string,
): string =>
  `akc.io — ${PARTICIPANT_UPDATE_COPY[reason].subject}: ${eventName}`;

export interface ParticipantUpdateProps {
  update: ParticipantUpdatePayload;
  /** Signed-in access when the contact is the account's e-mail, else the sign-in page. */
  url: string;
  /** The payment page the QR code encodes. */
  payUrl: string;
}

const STATUS_LABELS: Record<UpdateTerm['status'], string> = {
  confirmed: 'Potvrzeno',
  waitlisted: 'Náhradník',
  pending: 'Čeká na schválení',
  cancelled: 'Odhlášeno',
};

const STATUS_COLORS: Record<UpdateTerm['status'], string> = {
  confirmed: 'text-green-700',
  waitlisted: 'text-amber-700',
  pending: 'text-gray-700',
  cancelled: 'text-gray-500',
};

const Row = ({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): React.JSX.Element => (
  <table width="100%" role="presentation" cellPadding={0} cellSpacing={0}>
    <tbody>
      <tr>
        <td className="py-1 text-sm text-gray-500 align-top">{label}</td>
        <td
          className={`py-1 text-sm text-right align-top ${strong ? 'font-bold text-gray-900' : 'text-gray-900'}`}
        >
          {value}
        </td>
      </tr>
    </tbody>
  </table>
);

const TermList = ({
  title,
  terms,
}: {
  title: string;
  terms: UpdateTerm[];
}): React.JSX.Element => (
  <>
    <Text className="text-base font-semibold text-gray-900 mt-6 mb-1">
      {title}
    </Text>
    {terms.map((term, index) => (
      <Section
        key={index}
        className="border-solid border-0 border-t border-gray-200 py-2"
      >
        <table width="100%" role="presentation" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td className="align-top">
                <Text className="m-0 text-sm font-semibold text-gray-900">
                  {term.label}
                </Text>
                <Text className="m-0 text-sm text-gray-500">
                  {formatDateRange(term.startDate, term.endDate)}
                </Text>
              </td>
              <td className="align-top text-right">
                <Text
                  className={`m-0 text-xs font-semibold ${STATUS_COLORS[term.status]}`}
                >
                  {STATUS_LABELS[term.status]}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
    ))}
    <Hr className="border-gray-200 my-0" />
  </>
);

const CHANGE_TITLES: Partial<Record<ParticipantUpdateReason, string>> = {
  requestReceived: 'Navrhované změny údajů',
  requestApproved: 'Provedené změny údajů',
  requestRejected: 'Zamítnuté změny údajů',
};

const Changes = ({
  title,
  changes,
}: {
  title: string;
  changes: UpdateChange[];
}): React.JSX.Element => (
  <>
    <Text className="text-base font-semibold text-gray-900 mt-6 mb-1">
      {title}
    </Text>
    {changes.map((change, index) => (
      <Section
        key={index}
        className="border-solid border-0 border-t border-gray-200 py-2"
      >
        <Text className="m-0 text-sm font-semibold text-gray-900">
          {change.label}
        </Text>
        <Text className="m-0 text-sm text-gray-500">
          Dosud: {change.original}
        </Text>
        <Text className="m-0 text-sm text-gray-900">
          Nově: {change.proposed}
        </Text>
      </Section>
    ))}
    <Hr className="border-gray-200 my-0" />
  </>
);

const Payments = ({
  update,
  payUrl,
}: {
  update: ParticipantUpdatePayload;
  payUrl: string;
}): React.JSX.Element => {
  const { payment } = update;
  const kind = balanceKind(payment.balanceMinor);
  const { bank } = payment;
  // Nothing owed and nothing ever paid: there is no payment block to show.
  if (kind === 'settled' && payment.receivedMinor === 0 && !payment.recorded) {
    return <></>;
  }
  return (
    <>
      <Text className="text-base font-semibold text-gray-900 mt-6 mb-1">
        Platby
      </Text>
      {payment.recorded ? (
        <>
          <Row
            label="Přijatá platba"
            value={formatMoney(payment.recorded.amountMinor)}
            strong
          />
          <Row
            label="Datum platby"
            value={formatDateRange(
              payment.recorded.receivedOn,
              payment.recorded.receivedOn,
            )}
          />
        </>
      ) : null}
      <Row label="Celkem přijato" value={formatMoney(payment.receivedMinor)} />
      <Row
        label={kind === 'overpaid' ? 'Přeplatek' : 'Zbývá uhradit'}
        value={formatMoney(Math.abs(payment.balanceMinor))}
        strong
      />
      {kind === 'settled' ? (
        <Text className="text-sm text-gray-900 leading-5">
          Vše je uhrazeno.
        </Text>
      ) : null}
      {kind === 'overpaid' ? (
        <Text className="text-sm text-gray-700 leading-5">
          O naložení s přeplatkem se domluvte s organizátorem.
        </Text>
      ) : null}
      {kind === 'debt' ? (
        <Section className="bg-gray-100 rounded-md p-4 mt-4">
          <Text className="text-base font-semibold text-gray-900 m-0 mb-2">
            Platební údaje
          </Text>
          <Row
            label="Číslo účtu"
            value={formatBankAccount({
              prefix: bank.prefix,
              number: bank.number,
              bankCode: bank.bankCode,
            })}
          />
          <Row label="Variabilní symbol" value={bank.variableSymbol} />
          {bank.reminderAt ? (
            <Row
              label="Datum připomenutí platby"
              value={formatPragueDate(new Date(bank.reminderAt))}
            />
          ) : null}
          <Section className="mt-3">
            <QRCodeSVG
              value={payUrl}
              size={160}
              role="img"
              aria-label="QR kód pro platbu"
            />
            <Text className="text-xs text-gray-600 leading-5 mt-2 mb-0">
              Kód vede na stránku platby. Funguje-li váš e-mail bez obrázků,
              použijte odkaz: {payUrl}
            </Text>
          </Section>
        </Section>
      ) : null}
    </>
  );
};

export const ParticipantUpdate = ({
  update,
  url,
  payUrl,
}: ParticipantUpdateProps): React.JSX.Element => {
  const copy = PARTICIPANT_UPDATE_COPY[update.reason];
  const proposed = update.proposedTerms;
  const { organizer } = update;
  return (
    <Html lang="cs">
      <Head />
      <Preview>
        {copy.heading}: {update.eventName}
      </Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans py-6">
          <Container className="bg-white rounded-lg mx-auto p-6 max-w-xl">
            <EmailBrand url={url} logoSrc={`cid:${LOGO_CID}`} />
            <Heading className="text-2xl font-bold text-gray-900 mt-6 mb-0">
              {copy.heading}
            </Heading>
            <Text className="text-base text-gray-900 mt-1">
              {update.eventName}
            </Text>
            <Text className="text-gray-700 text-base leading-6">
              {copy.sentence}
            </Text>

            {update.changes.length > 0 ? (
              <Changes
                title={CHANGE_TITLES[update.reason] ?? 'Změny údajů'}
                changes={update.changes}
              />
            ) : null}
            <TermList
              title={proposed ? 'Stále platí' : 'Vaše termíny'}
              terms={update.terms}
            />
            {proposed ? (
              <TermList title="Navrhovaná změna" terms={proposed} />
            ) : null}
            {proposed ? null : <Payments update={update} payUrl={payUrl} />}

            <Text className="text-base font-semibold text-gray-900 mt-6 mb-1">
              Kontakt na organizátora
            </Text>
            <Text className="m-0 text-sm text-gray-900">{organizer.name}</Text>
            {organizer.email ? (
              <Text className="m-0 text-sm text-gray-900">
                {organizer.email}
              </Text>
            ) : null}
            {organizer.phone ? (
              <Text className="m-0 text-sm text-gray-900">
                {organizer.phone}
              </Text>
            ) : null}

            <Section className="my-6">
              <Button
                href={url}
                className="bg-gray-900 text-white font-semibold rounded-md px-6 py-3 box-border block w-full text-center"
              >
                Moje přihlášky
              </Button>
              <Text className="text-gray-600 text-xs leading-5 mt-2 mb-0">
                {update.hasMagicLink
                  ? 'Přihlašovací odkaz platí 15 minut a jde použít jen jednou. Až vyprší, na stránce si můžete vyžádat nový.'
                  : 'Přihlaste se e-mailem, který jste použili při registraci. Tento e-mail neobsahuje přihlašovací odkaz.'}
              </Text>
            </Section>
            <Hr className="border-gray-200 my-4" />
            <Text className="text-gray-400 text-xs m-0">© akc.io</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ParticipantUpdate;
