import * as React from 'react';
import { Column, Img, Row, Section, Text } from 'react-email';
import { LOGO_CID } from '../brand-logo';

/**
 * The akc.io icon next to the wordmark, as in the app's header. The icon is
 * attached to the message (`brandLogo`) and referenced by `cid:`: mail clients
 * cannot reach the app's own origin and block remote images by default. The
 * wordmark stays readable when images are blocked, so the icon has an empty
 * alt.
 */
export const EmailBrand = (): React.JSX.Element => (
  <Section>
    <Row>
      <Column width={36} className="align-middle">
        <Img src={`cid:${LOGO_CID}`} width={28} height={28} alt="" />
      </Column>
      <Column className="align-middle">
        <Text className="text-lg font-bold text-gray-900 m-0">akc.io</Text>
      </Column>
    </Row>
  </Section>
);
