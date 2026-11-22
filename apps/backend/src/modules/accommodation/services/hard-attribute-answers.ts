import { PrismaService } from '@/core/prisma/prisma.service';
import {
  answerOf,
  GENDER_ATTRIBUTE,
} from '@/modules/accommodation/domain/attributes';
import { Injectable } from '@nestjs/common';

/** Where participants' answers to the hard attribute come from. */
export abstract class HardAttributeAnswers {
  /** Answer by registration; a missing entry means no answer. */
  abstract answers(
    eventId: string,
    attribute: string,
    registrationIds: string[],
  ): Promise<Map<string, string | null>>;
}

/**
 * Answers stored with the registration: the gender answer (F64) or the
 * chosen option of one of the event's questions (#485). An attribute that is
 * neither has no answers, so nobody is guessed.
 */
@Injectable()
export class RegistrationHardAttributeAnswers extends HardAttributeAnswers {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async answers(
    eventId: string,
    attribute: string,
    registrationIds: string[],
  ): Promise<Map<string, string | null>> {
    if (attribute === GENDER_ATTRIBUTE) {
      const rows = await this.prisma.registration.findMany({
        where: { eventId, id: { in: registrationIds } },
        select: { id: true, gender: true },
      });
      return new Map(rows.map((row) => [row.id, answerOf(attribute, row)]));
    }
    const answers = await this.prisma.registrationAnswer.findMany({
      where: {
        eventId,
        questionId: attribute,
        registrationId: { in: registrationIds },
      },
      select: { registrationId: true, optionId: true },
    });
    return new Map(
      answers.map((answer) => [answer.registrationId, answer.optionId]),
    );
  }
}
