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
  formatBankAccount,
  formatDateRange,
  formatMoney,
  formatPragueDate,
} from './format';

export interface ConfirmationTerm {
  label: string;
  startDate: string;
  endDate: string;
  priceMinor: number;
  status: 'confirmed' | 'waitlisted';
}

export interface ConfirmationPayment {
  amountMinor: number;
  variableSymbol: string;
  account: { prefix: string | null; number: string; bankCode: string };
  reminderAt: Date;
}

export interface RegistrationConfirmationProps {
  eventName: string;
  terms: ConfirmationTerm[];
  selectedPriceMinor: number;
  /** Null when nothing is due: no reminder date and no request to pay. */
  payment: ConfirmationPayment | null;
  url: string;
}

export const confirmationSubject = (eventName: string): string =>
  `akc.io — přihláška přijata: ${eventName}`;

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

export const RegistrationConfirmation = ({
  eventName,
  terms,
  selectedPriceMinor,
  payment,
  url,
}: RegistrationConfirmationProps): React.JSX.Element => {
  const hasWaitlisted = terms.some((term) => term.status === 'waitlisted');
  return (
    <Html lang="cs">
      <Head />
      <Preview>Vaši přihlášku jsme přijali: {eventName}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans py-6">
          <Container className="bg-white rounded-lg mx-auto p-6 max-w-xl">
            <Text className="text-lg font-bold text-gray-900 m-0">akc.io</Text>
            <Heading className="text-2xl font-bold text-gray-900 mt-6 mb-0">
              Přihláška přijata
            </Heading>
            <Text className="text-base text-gray-900 mt-1">{eventName}</Text>
            <Text className="text-gray-700 text-base leading-6">
              Vaši přihlášku jsme přijali. Níže najdete stav účasti v
              jednotlivých termínech a případné platební instrukce.
            </Text>

            <Text className="text-base font-semibold text-gray-900 mt-6 mb-1">
              Termíny
            </Text>
            {terms.map((term, index) => (
              <Section
                key={index}
                className="border-solid border-0 border-t border-gray-200 py-2"
              >
                <table
                  width="100%"
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                >
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
                        <Text className="m-0 text-sm text-gray-900">
                          {formatMoney(term.priceMinor)}
                        </Text>
                        <Text
                          className={`m-0 text-xs font-semibold ${term.status === 'confirmed' ? 'text-green-700' : 'text-amber-700'}`}
                        >
                          {term.status === 'confirmed'
                            ? 'Potvrzeno'
                            : 'Náhradník'}
                        </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            ))}
            <Hr className="border-gray-200 my-0" />

            <Section className="mt-3">
              <Row
                label="Cena výběru"
                value={formatMoney(selectedPriceMinor)}
              />
              {payment ? (
                <Row
                  label="K úhradě za potvrzené termíny"
                  value={formatMoney(payment.amountMinor)}
                  strong
                />
              ) : null}
            </Section>

            {hasWaitlisted ? (
              <Text className="text-sm text-gray-600 leading-5">
                U termínů označených „Náhradník“ zatím nemáte zajištěné místo.
                Za tyto termíny nic neplatíte.
              </Text>
            ) : null}

            {payment ? (
              <Section className="bg-gray-100 rounded-md p-4 mt-4">
                <Text className="text-base font-semibold text-gray-900 m-0 mb-2">
                  Platební instrukce
                </Text>
                <Row label="Částka" value={formatMoney(payment.amountMinor)} />
                <Row
                  label="Datum připomenutí platby"
                  value={formatPragueDate(payment.reminderAt)}
                />
                <Row
                  label="Číslo účtu"
                  value={formatBankAccount(payment.account)}
                />
                <Row label="Variabilní symbol" value={payment.variableSymbol} />
              </Section>
            ) : (
              <Text className="text-sm text-gray-900 leading-5 font-semibold">
                Nyní není co hradit.
              </Text>
            )}

            <Section className="my-6">
              <Button
                href={url}
                className="bg-gray-900 text-white font-semibold rounded-md px-6 py-3 box-border block w-full text-center"
              >
                Moje přihlášky
              </Button>
              <Text className="text-gray-600 text-xs leading-5 mt-2 mb-0">
                Přihlašovací odkaz platí 15 minut a jde použít jen jednou. Až
                vyprší, na stránce si můžete vyžádat nový.
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

export default RegistrationConfirmation;
