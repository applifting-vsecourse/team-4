export interface EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}
