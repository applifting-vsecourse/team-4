import { Injectable } from '@nestjs/common';

/**
 * Where participants' answers to the hard attribute come from. The registration
 * form has no categorical questions yet (F64, the categorical-questions story);
 * the story that adds them provides an implementation reading the stored
 * answers.
 */
export abstract class HardAttributeAnswers {
  /** Answer by registration; a missing entry means no answer. */
  abstract answers(
    eventId: string,
    attribute: string,
    registrationIds: string[],
  ): Promise<Map<string, string | null>>;
}

/** No question stores answers yet: everyone is unanswered, nobody is guessed. */
@Injectable()
export class NoHardAttributeAnswers extends HardAttributeAnswers {
  answers(): Promise<Map<string, string | null>> {
    return Promise.resolve(new Map());
  }
}
