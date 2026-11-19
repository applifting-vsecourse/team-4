export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  /** Sender header; defaults to `user`. Gmail keeps only the display name. */
  from?: string;
}
