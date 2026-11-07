import { paymentQrImage, QR_CID } from './qr-code';

describe('paymentQrImage', () => {
  it('is a PNG attachment for the cid the template uses', async () => {
    const image = await paymentQrImage('http://app.test/platba/abc');

    expect(image.cid).toBe(QR_CID);
    expect(image.contentType).toBe('image/png');
    // PNG signature.
    expect([...image.content.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
