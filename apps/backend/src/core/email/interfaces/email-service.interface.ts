export type SendResult = {
  /** False when the service deliberately did not hand the message on. */
  sent: boolean;
  /** The provider's identifier of the message it accepted. */
  messageId: string | null;
};

export interface EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<SendResult>;
}
