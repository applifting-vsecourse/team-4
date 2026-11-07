import { ResendAdapter } from './resend-adapter';

const send = jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null });
jest.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

const image = {
  cid: 'logo',
  filename: 'logo.png',
  contentType: 'image/png',
  content: Buffer.from('png'),
};

describe('ResendAdapter', () => {
  beforeEach(() => send.mockClear());

  it('attaches inline images by contentId', async () => {
    const adapter = new ResendAdapter({ apiKey: 'k', from: 'f@akc.io' });

    await expect(
      adapter.sendEmail('a@b.cz', 'S', '<p/>', [image]),
    ).resolves.toEqual({ sent: true, messageId: 'r1' });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: 'logo.png',
            content: image.content,
            contentType: 'image/png',
            contentId: 'logo',
          },
        ],
      }),
    );
  });

  it('sends no attachments without images', async () => {
    const adapter = new ResendAdapter({ apiKey: 'k', from: 'f@akc.io' });

    await adapter.sendEmail('a@b.cz', 'S', '<p/>');

    expect(send.mock.calls[0][0].attachments).toBeUndefined();
  });
});
