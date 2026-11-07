import { SMTPAdapter } from './smtp-adapter';

const sendMail = jest.fn().mockResolvedValue({ messageId: 'm1' });
jest.mock('nodemailer', () => ({
  createTransport: (): object => ({ sendMail }),
}));

const config = { host: 'h', port: 25, secure: false, user: 'u', pass: 'p' };
const image = {
  cid: 'logo',
  filename: 'logo.png',
  contentType: 'image/png',
  content: Buffer.from('png'),
};

describe('SMTPAdapter', () => {
  beforeEach(() => sendMail.mockClear());

  it('attaches inline images by cid', async () => {
    await new SMTPAdapter(config).sendEmail('a@b.cz', 'S', '<p/>', [image]);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: 'logo.png',
            content: image.content,
            contentType: 'image/png',
            cid: 'logo',
          },
        ],
      }),
    );
  });

  it('sends no attachments without images', async () => {
    await new SMTPAdapter(config).sendEmail('a@b.cz', 'S', '<p/>');

    expect(sendMail.mock.calls[0][0].attachments).toBeUndefined();
  });
});
