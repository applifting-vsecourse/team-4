import { PrismaService } from '@/core/prisma/prisma.service';
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

/** The hard attribute answered by the F64 gender question (spec v4 §11). */
export const GENDER_ATTRIBUTE = 'gender';

/**
 * Answers stored on the registration. Only the gender question (F64) exists
 * yet, the first preset of a categorical question; any other attribute has no
 * answers until the categorical-questions story stores them, so nobody is
 * guessed.
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
    if (attribute !== GENDER_ATTRIBUTE) return new Map();
    const rows = await this.prisma.registration.findMany({
      where: { eventId, id: { in: registrationIds } },
      select: { id: true, gender: true },
    });
    return new Map(rows.map((row) => [row.id, row.gender]));
  }
}
