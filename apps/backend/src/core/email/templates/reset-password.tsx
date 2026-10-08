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

export interface ResetPasswordProps {
  username: string;
  url: string;
}

export const ResetPassword = ({
  username,
  url,
}: ResetPasswordProps): React.JSX.Element => (
  <Html>
    <Head />
    <Preview>Reset your Quacker password</Preview>
    <Tailwind>
      <Body className="bg-gray-50 font-sans py-10">
        <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
          <Heading className="text-2xl font-bold text-gray-900 m-0">
            Reset your password
          </Heading>
          <Text className="text-gray-700 text-base leading-6 mt-4">
            Hi {username}, we received a request to reset your Quacker password.
            Click the button below to choose a new one.
          </Text>
          <Section className="text-center my-8">
            <Button
              href={url}
              className="bg-yellow-400 text-gray-900 font-semibold rounded-md px-6 py-3"
            >
              Reset password
            </Button>
          </Section>
          <Text className="text-gray-600 text-sm leading-5">
            If the button doesn&apos;t work, copy and paste this link into your
            browser:
          </Text>
          <Text className="text-blue-600 text-sm break-all">{url}</Text>
          <Hr className="border-gray-200 my-6" />
          <Text className="text-gray-400 text-xs">
            If you didn&apos;t request a password reset, you can safely ignore
            this email — your password will stay the same.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default ResetPassword;
