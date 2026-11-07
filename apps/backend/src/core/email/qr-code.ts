import { InlineImage } from '@/core/email/interfaces/email-service.interface';
import * as QRCode from 'qrcode';

export const QR_CID = 'akcio-payment-qr';

/**
 * The QR code of a payment link as a PNG that travels with the message.
 * Inline SVG is stripped by mail clients such as Seznam, an attached image is
 * not.
 */
export const paymentQrImage = async (link: string): Promise<InlineImage> => ({
  cid: QR_CID,
  filename: 'platba-qr.png',
  contentType: 'image/png',
  content: await QRCode.toBuffer(link, {
    type: 'png',
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'M',
  }),
});
