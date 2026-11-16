import { PrismaService } from '@/core/prisma/prisma.service';
import { HardAttributeOption } from '@/modules/accommodation/domain/determination';
import { ownedEvent } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { termInputsChanged } from '@/modules/accommodation/repositories/term-inputs';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

/** What saving the hard attribute did; null for an event the caller cannot manage. */
export type HardAttributeSave = 'saved' | 'unchanged' | null;

const sameValues = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value) => b.includes(value));

/** Pravidla ubytování of an event (spec v4 §2): its hard attribute. */
@Injectable()
export class AccommodationRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The chosen hard attribute, null when rooms are not split by one;
   * undefined for an event outside the caller's organizations.
   */
  async findHardAttribute(
    scope: EventScope,
  ): Promise<string | null | undefined> {
    const event = await this.prisma.event.findFirst({
      where: ownedEvent(scope),
      select: { accommodationRules: { select: { hardAttribute: true } } },
    });
    if (!event) return undefined;
    return event.accommodationRules?.hardAttribute ?? null;
  }

  /**
   * Chooses the hard attribute, or none. A change makes the evaluation of
   * every term of the event stale (and due again in the automatic mode);
   * it confirms, cancels and moves nobody. Determinations stay: switching
   * the attribute off and on keeps them valid for the same answers. Gender
   * is the only option, so no determination can belong to another
   * attribute; the categorical-questions story must handle that switch.
   */
  async saveHardAttribute(
    scope: EventScope,
    option: HardAttributeOption | null,
  ): Promise<HardAttributeSave> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: ownedEvent(scope),
        select: {
          accommodationRules: {
            select: { hardAttribute: true, nonDeterminingValues: true },
          },
        },
      });
      if (!event) return null;
      const data = {
        hardAttribute: option?.attribute ?? null,
        nonDeterminingValues: option ? [...option.nonDeterminingValues] : [],
      };
      const rules = event.accommodationRules;
      const isUnchanged =
        data.hardAttribute === null
          ? (rules?.hardAttribute ?? null) === null
          : rules?.hardAttribute === data.hardAttribute &&
            sameValues(rules.nonDeterminingValues, data.nonDeterminingValues);
      if (isUnchanged) return 'unchanged';
      await tx.accommodationRules.upsert({
        where: { eventId: scope.eventId },
        create: { eventId: scope.eventId, ...data },
        update: data,
      });
      await termInputsChanged(tx, scope.eventId);
      return 'saved';
    });
  }
}
