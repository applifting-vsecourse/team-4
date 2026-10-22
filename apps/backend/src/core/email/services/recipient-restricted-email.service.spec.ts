import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { RecipientRestrictedEmailService } from './recipient-restricted-email.service';

describe('RecipientRestrictedEmailService', () => {
  const build = () => {
    const inner: jest.Mocked<EmailService> = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };
    return {
      inner,
      service: new RecipientRestrictedEmailService(
        inner,
        'Allowed@Example.com',
      ),
    };
  };

  it('forwards mail to the allowed address, ignoring case and whitespace', async () => {
    const { inner, service } = build();
    await service.sendEmail(' allowed@example.com ', 'Hi', '<p>x</p>');
    expect(inner.sendEmail).toHaveBeenCalledWith(
      ' allowed@example.com ',
      'Hi',
      '<p>x</p>',
    );
  });

  it('drops mail to any other address without failing', async () => {
    const { inner, service } = build();
    await expect(
      service.sendEmail('other@example.com', 'Hi', '<p>x</p>'),
    ).resolves.toBeUndefined();
    expect(inner.sendEmail).not.toHaveBeenCalled();
  });
});
