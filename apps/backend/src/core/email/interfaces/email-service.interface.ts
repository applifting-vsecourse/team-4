export type SendResult = {
  /** False when the service deliberately did not hand the message on. */
  sent: boolean;
  /** The provider's identifier of the message it accepted. */
  messageId: string | null;
};

/** An image shown inside the message, referenced from the HTML as `cid:<cid>`. */
export type InlineImage = {
  cid: string;
  filename: string;
  contentType: string;
  content: Buffer;
};

export interface EmailService {
  sendEmail(
    to: string,
    subject: string,
    html: string,
    inlineImages?: InlineImage[],
  ): Promise<SendResult>;
}
