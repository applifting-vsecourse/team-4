import * as React from 'react';
import { Column, Img, Row, Section, Text } from 'react-email';

/**
 * The akc.io icon next to the wordmark, as in the app's header. Mail clients
 * need a public PNG, so the icon is the frontend's touch icon, loaded from the
 * origin of the e-mail's own link. The wordmark stays readable when images are
 * blocked, so the icon has an empty alt.
 */
export const EmailBrand = ({ url }: { url: string }): React.JSX.Element => (
  <Section>
    <Row>
      <Column width={36} className="align-middle">
        <Img
          src={`${new URL(url).origin}/apple-touch-icon.png`}
          width={28}
          height={28}
          alt=""
        />
      </Column>
      <Column className="align-middle">
        <Text className="text-lg font-bold text-gray-900 m-0">akc.io</Text>
      </Column>
    </Row>
  </Section>
);
