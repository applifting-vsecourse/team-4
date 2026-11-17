import { EmailService } from '@/core/email/interfaces/email-service.interface';
import {
  isReservedAddress,
  ReservedDomainEmailService,
} from './reserved-domain-email.service';

describe('isReservedAddress', () => {
  it.each([
    'eva-1@example.test',
    'a@host.invalid',
    'a@x.example',
    'a@localhost',
    'a@example.com',
    'a@mail.example.org',
    ' A@Example.NET ',
  ])('treats %s as reserved', (address) => {
    expect(isReservedAddress(address)).toBe(true);
  });

  it.each([
    'krom13@vse.cz',
    'team@gmail.com',
    'a@notexample.com',
    'a@example.com.cz',
    'a@testing.cz',
  ])('lets %s through', (address) => {
    expect(isReservedAddress(address)).toBe(false);
  });
});

describe('ReservedDomainEmailService', () => {
  const build = () => {
    const inner: jest.Mocked<EmailService> = {
      sendEmail: jest.fn().mockResolvedValue({ sent: true, messageId: 'm1' }),
    };
    return { inner, service: new ReservedDomainEmailService(inner) };
  };

  it('reports success without handing a reserved address to the provider', async () => {
    const { inner, service } = build();

    await expect(
      service.sendEmail('eva@example.test', 'Hi', '<p>x</p>'),
    ).resolves.toEqual({ sent: true, messageId: null });
    expect(inner.sendEmail).not.toHaveBeenCalled();
  });

  it('forwards mail to a real address unchanged', async () => {
    const { inner, service } = build();

    await expect(
      service.sendEmail('krom13@vse.cz', 'Hi', '<p>x</p>'),
    ).resolves.toEqual({ sent: true, messageId: 'm1' });
    expect(inner.sendEmail).toHaveBeenCalledWith(
      'krom13@vse.cz',
      'Hi',
      '<p>x</p>',
      undefined,
    );
  });
});
