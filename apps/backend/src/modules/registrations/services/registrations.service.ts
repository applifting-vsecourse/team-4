import {
  RegistrationInput,
  RegistrationResultModel,
  submissionHash,
} from '@/modules/registrations/domain/registration';
import { RegistrationsRepository } from '@/modules/registrations/repositories/registrations.repository';
import { isUniqueViolation } from '@/modules/rooms/repositories/rooms.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// Error bodies carry a `code` (and the form `field` where one fits) next to
// the Czech `message`, so the form can put the error at the right input.
const eventUnavailable = (): NotFoundException =>
  new NotFoundException({
    statusCode: 404,
    code: 'event_unavailable',
    message: 'Přihlašování na tuto akci není dostupné.',
  });

// Reveals nothing of the existing registration (S2-08): no state, no terms.
const alreadyRegistered = (): ConflictException =>
  new ConflictException({
    statusCode: 409,
    code: 'already_registered',
    field: 'email',
    message: 'Přihláška s tímto e-mailem na tuto akci již existuje.',
  });

const keyReused = (): ConflictException =>
  new ConflictException({
    statusCode: 409,
    code: 'submission_key_reused',
    message:
      'Tato přihláška už byla odeslána s jinými údaji. Načtěte formulář znovu.',
  });

export type SubmitResult = {
  /** False when this repeats a submission that was already saved. */
  created: boolean;
  result: RegistrationResultModel;
};

@Injectable()
export class RegistrationsService {
  constructor(private readonly repository: RegistrationsRepository) {}

  /**
   * A repeat of a saved submission (same key and content) returns the stored
   * result unchanged, whatever the event or capacity is now. Anything else is
   * decided against the current state of the event.
   */
  async submit(
    publicId: string,
    input: RegistrationInput,
  ): Promise<SubmitResult> {
    const payloadHash = submissionHash(input);
    const stored = await this.storedResult(publicId, input, payloadHash);
    if (stored) return { created: false, result: stored };

    let outcome;
    try {
      outcome = await this.repository.submit(publicId, input, payloadHash);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Either a concurrent submit with the same key won the race, or the
      // e-mail is already registered for this event.
      const raced = await this.storedResult(publicId, input, payloadHash);
      if (raced) return { created: false, result: raced };
      throw alreadyRegistered();
    }

    if (outcome.kind === 'event_unavailable') throw eventUnavailable();
    if (outcome.kind === 'term_unknown') {
      throw new BadRequestException({
        statusCode: 400,
        code: 'term_unknown',
        field: 'termIds',
        message: 'Vyberte termíny této akce.',
      });
    }
    return { created: true, result: outcome.result };
  }

  private async storedResult(
    publicId: string,
    input: RegistrationInput,
    payloadHash: string,
  ): Promise<RegistrationResultModel | null> {
    const stored = await this.repository.findBySubmissionKey(
      input.submissionKey,
    );
    if (!stored) return null;
    if (stored.publicId !== publicId || stored.payloadHash !== payloadHash) {
      throw keyReused();
    }
    return stored.result;
  }
}
