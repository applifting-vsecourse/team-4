import { EventScope } from '@/modules/events/repositories/events.repository';
import { QuestionDraft } from '@/modules/registrations/domain/questions';
import {
  ManagedQuestion,
  RegistrationQuestionsRepository,
} from '@/modules/registrations/repositories/registration-questions.repository';
import { isForeignKeyViolation } from '@/modules/rooms/repositories/rooms.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

/** The categorical questions of an event's registration form (#485). */
@Injectable()
export class RegistrationQuestionsService {
  constructor(private readonly repository: RegistrationQuestionsRepository) {}

  async questions(scope: EventScope): Promise<ManagedQuestion[]> {
    const questions = await this.repository.find(scope);
    if (!questions) throw notAvailable();
    return questions;
  }

  async save(
    scope: EventScope,
    drafts: readonly QuestionDraft[],
  ): Promise<ManagedQuestion[]> {
    let saved: Awaited<ReturnType<RegistrationQuestionsRepository['save']>>;
    try {
      saved = await this.repository.save(scope, drafts);
    } catch (error) {
      // A participant answered with a removed option meanwhile (#485).
      if (!isForeignKeyViolation(error)) throw error;
      throw new ConflictException({
        statusCode: 409,
        code: 'question_answered',
        message:
          'Účastník mezitím odpověděl na otázku nebo možnost, kterou odebíráte. Načtěte otázky znovu.',
      });
    }
    switch (saved.kind) {
      case 'not_found':
        throw notAvailable();
      case 'refused':
        throw saved.error.code === 'questions_invalid'
          ? new BadRequestException({
              statusCode: 400,
              code: saved.error.code,
              message: saved.error.message,
            })
          : new ConflictException({
              statusCode: 409,
              code: saved.error.code,
              message: saved.error.message,
            });
      case 'saved':
        return saved.questions;
    }
  }
}
