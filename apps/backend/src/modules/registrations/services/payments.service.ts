import { EventScope } from '@/modules/events/repositories/events.repository';
import { ManagedRegistrationDetailModel } from '@/modules/registrations/domain/managed-registration';
import {
  isFutureDate,
  isSamePayment,
  PaymentInput,
} from '@/modules/registrations/domain/payment';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { PaymentsRepository } from '@/modules/registrations/repositories/payments.repository';
import { ParticipantUpdateService } from '@/modules/registrations/services/participant-update.service';
import { isUniqueViolation } from '@/modules/rooms/repositories/rooms.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

const futureDate = (): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    code: 'received_on_future',
    field: 'receivedOn',
    message: 'Datum přijetí nesmí být v budoucnosti.',
  });

const keyReused = (): ConflictException =>
  new ConflictException({
    statusCode: 409,
    code: 'submission_key_reused',
    message:
      'Tato platba už byla odeslána s jinými údaji. Otevřete dialog znovu.',
  });

export type RecordResult = {
  /** False when this repeats a payment that was already saved. */
  created: boolean;
  registration: ManagedRegistrationDetailModel;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly payments: PaymentsRepository,
    private readonly registrations: EventRegistrationsRepository,
    private readonly updates: ParticipantUpdateService,
  ) {}

  /**
   * Appends one received payment (S2-12). A repeat of a saved request (same
   * key and content) adds nothing and returns the same current registration.
   * Registrations of other events or organizations look missing (S2-03).
   */
  async record(
    scope: EventScope,
    registrationId: string,
    input: PaymentInput,
  ): Promise<RecordResult> {
    if (!(await this.payments.registrationInScope(scope, registrationId))) {
      throw notAvailable();
    }
    if (isFutureDate(input.receivedOn)) throw futureDate();

    let created = true;
    if (await this.isSaved(registrationId, input)) {
      created = false;
    } else {
      try {
        await this.payments.create(scope, registrationId, input, scope.ownerId);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // A concurrent request with the same key won the race.
        if (!(await this.isSaved(registrationId, input))) throw error;
        created = false;
      }
    }

    // The e-mail was queued with the payment; a repeat queues nothing new.
    this.updates.dispatch(registrationId);

    // Read back from the database, never an optimistic result.
    const registration = await this.registrations.findOne(
      scope,
      registrationId,
    );
    if (!registration) throw notAvailable();
    return { created, registration };
  }

  private async isSaved(
    registrationId: string,
    input: PaymentInput,
  ): Promise<boolean> {
    const stored = await this.payments.findBySubmissionKey(input.submissionKey);
    if (!stored) return false;
    if (!isSamePayment(stored, registrationId, input)) throw keyReused();
    return true;
  }
}
