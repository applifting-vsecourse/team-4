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
import { EmailBrand } from './email-brand';
import * as React from 'react';

export interface ParticipantMagicLinkProps {
  url: string;
}

export const ParticipantMagicLink = ({
  url,
}: ParticipantMagicLinkProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>Přihlašovací odkaz do akc.io</Preview>
    <Tailwind>
      <Body className="bg-gray-50 font-sans py-10">
        <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
          <EmailBrand url={url} />
          <Heading className="text-2xl font-bold text-gray-900 mt-6 mb-0">
            Vaše přihlášky v akc.io
          </Heading>
          <Text className="text-gray-700 text-base leading-6 mt-4">
            Klikněte na tlačítko a uvidíte své přihlášky. Odkaz platí 15 minut a
            jde použít jen jednou.
          </Text>
          <Section className="text-center my-8">
            <Button
              href={url}
              className="bg-lime-300 text-gray-900 font-semibold rounded-md px-6 py-3"
            >
              Zobrazit moje přihlášky
            </Button>
          </Section>
          <Text className="text-gray-600 text-sm leading-5">
            Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
          </Text>
          <Text className="text-blue-600 text-sm break-all">{url}</Text>
          <Hr className="border-gray-200 my-6" />
          <Text className="text-gray-400 text-xs">
            Pokud jste o odkaz nežádali, můžete tento e-mail ignorovat. Nikdo se
            bez něj k vašim přihláškám nedostane.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default ParticipantMagicLink;
