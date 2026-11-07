import { PAYMENT_TOKEN_PATTERN } from '@/modules/registrations/domain/qr-payment';
import {
  QrPaymentPage,
  QrPaymentsRepository,
} from '@/modules/registrations/repositories/qr-payments.repository';
import { ParticipantUpdateService } from '@/modules/registrations/services/participant-update.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const unavailable = (): NotFoundException =>
  new NotFoundException({
    statusCode: 404,
    code: 'payment_unavailable',
    message: 'Platba není dostupná.',
  });

export type QrPaymentResult = {
  /** False when this repeats a payment that was already saved. */
  created: boolean;
  paidMinor: number;
  balanceMinor: number;
};

/**
 * Payment through a QR link (F21-1). The token alone opens one registration's
 * payment; it creates no participant session. A malformed token looks the
 * same as an unknown one.
 */
@Injectable()
export class QrPaymentsService {
  constructor(
    private readonly repository: QrPaymentsRepository,
    private readonly updates: ParticipantUpdateService,
  ) {}

  async getPage(token: string): Promise<QrPaymentPage> {
    if (!PAYMENT_TOKEN_PATTERN.test(token)) throw unavailable();
    const page = await this.repository.findPage(token);
    if (!page) throw unavailable();
    return page;
  }

  async pay(
    token: string,
    submissionKey: string,
    amountMinor: number,
  ): Promise<QrPaymentResult> {
    if (!PAYMENT_TOKEN_PATTERN.test(token)) throw unavailable();
    const outcome = await this.repository.pay(
      token,
      submissionKey,
      amountMinor,
    );
    switch (outcome.kind) {
      case 'paid':
        this.updates.dispatch(outcome.registrationId);
        return outcome;
      case 'unavailable':
        throw unavailable();
      case 'key_reused':
        throw new ConflictException({
          statusCode: 409,
          code: 'submission_key_reused',
          message: 'Tato platba už byla odeslána s jinou částkou.',
        });
      case 'nothing_to_pay':
        throw new ConflictException({
          statusCode: 409,
          code: 'nothing_to_pay',
          message: 'Přihláška je uhrazená, není co platit.',
          balanceMinor: outcome.balanceMinor,
        });
      case 'debt_reduced':
        throw new ConflictException({
          statusCode: 409,
          code: 'debt_reduced',
          message: 'Částka k úhradě se mezitím snížila.',
          balanceMinor: outcome.balanceMinor,
        });
    }
  }
}
