import * as React from 'react';
import { Text } from 'react-email';
import { PaymentOverview } from '@/modules/registrations/domain/payment-overview';
import { Row } from './email-row';
import { formatMoney } from './format';

/**
 * The amounts of a participant e-mail, worded as in the app (S5-02): a
 * preliminary price before confirmation, the confirmed price, what was paid
 * and what remains after it.
 */
export const PaymentOverviewRows = ({
  overview,
}: {
  overview: PaymentOverview;
}): React.JSX.Element => {
  if (overview.kind === 'cancelled') {
    return (
      <>
        <Text className="text-sm font-semibold text-gray-900 leading-5 m-0">
          Účast zrušena
        </Text>
        {overview.overpaidMinor > 0 ? (
          <Row
            label="Přeplatek"
            value={formatMoney(overview.overpaidMinor)}
            strong
          />
        ) : null}
        {overview.overpaidMinor > 0 ? <Settle /> : null}
      </>
    );
  }
  if (overview.kind === 'preliminary') {
    return (
      <>
        <Row
          label="Předběžná cena vybraných termínů"
          value={formatMoney(overview.priceMinor)}
        />
        <Text className="text-sm font-semibold text-gray-900 leading-5 mt-1">
          Zatím nic neplaťte. Platit budete až za termíny, které organizátor
          potvrdí.
        </Text>
      </>
    );
  }
  const { dueMinor, paidMinor, remainingMinor, overpaidMinor } = overview;
  if (dueMinor === 0 && paidMinor === 0) {
    return (
      <Text className="text-sm font-semibold text-gray-900 leading-5 m-0">
        Potvrzená účast je zdarma, nic neplatíte.
      </Text>
    );
  }
  return (
    <>
      <Row label="Cena potvrzených termínů" value={formatMoney(dueMinor)} />
      <Row label="Zaplaceno" value={formatMoney(paidMinor)} />
      {overpaidMinor > 0 ? (
        <>
          <Row label="Přeplatek" value={formatMoney(overpaidMinor)} strong />
          <Settle />
        </>
      ) : (
        <Row
          label="Zbývá zaplatit"
          value={formatMoney(remainingMinor)}
          strong
        />
      )}
      {remainingMinor === 0 && overpaidMinor === 0 ? (
        <Text className="text-sm text-gray-900 leading-5">
          Vše je uhrazeno.
        </Text>
      ) : null}
    </>
  );
};

/** An overpayment is settled with the organizer; no further payment is asked for. */
const Settle = (): React.JSX.Element => (
  <Text className="text-sm text-gray-700 leading-5">
    O naložení s přeplatkem se domluvte s organizátorem. Další platba není
    potřeba.
  </Text>
);
