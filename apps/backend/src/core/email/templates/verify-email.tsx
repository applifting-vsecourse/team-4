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
import * as React from 'react';

export interface VerifyEmailProps {
  url: string;
}

export const VerifyEmail = ({ url }: VerifyEmailProps): React.JSX.Element => (
  <Html>
    <Head />
    <Preview>Verify your Quacker email address</Preview>
    <Tailwind>
      <Body className="bg-gray-50 font-sans py-10">
        <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
          <Heading className="text-2xl font-bold text-gray-900 m-0">
            Welcome to Quacker
          </Heading>
          <Text className="text-gray-700 text-base leading-6 mt-4">
            Tap the button below to verify your email address and finish setting
            up your account.
          </Text>
          <Section className="text-center my-8">
            <Button
              href={url}
              className="bg-yellow-400 text-gray-900 font-semibold rounded-md px-6 py-3"
            >
              Verify email
            </Button>
          </Section>
          <Text className="text-gray-600 text-sm leading-5">
            If the button doesn&apos;t work, copy and paste this link into your
            browser:
          </Text>
          <Text className="text-blue-600 text-sm break-all">{url}</Text>
          <Hr className="border-gray-200 my-6" />
          <Text className="text-gray-400 text-xs">
            If you didn&apos;t create a Quacker account, you can safely ignore
            this email.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default VerifyEmail;
