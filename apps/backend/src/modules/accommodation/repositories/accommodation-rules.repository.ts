import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { HardAttributeOption } from '@/modules/accommodation/domain/determination';
import {
  DEFAULT_SOFT_ATTRIBUTES,
  readNeutralValues,
  samePreferences,
  SoftNeutralValues,
} from '@/modules/accommodation/domain/room-proposal-preferences';
import { ownedEvent } from '@/modules/accommodation/repositories/term-evaluation.repository';
import {
  termInputsChanged,
  termLayoutChanged,
} from '@/modules/accommodation/repositories/term-inputs';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

/** What saving the hard attribute did; null for an event the caller cannot manage. */
export type HardAttributeSave = 'saved' | 'unchanged' | null;

/** The soft preferences of the room proposal as stored (#389). */
export type StoredPreferences = {
  hardAttribute: string | null;
  softAttributes: readonly string[];
  softNeutralValues: SoftNeutralValues;
};

/**
 * What saving the soft preferences did: `hardAttribute` when the list
 * contains the event's hard attribute; null for an event the caller cannot
 * manage.
 */
export type PreferencesSave =
  | { result: 'saved' | 'unchanged'; preferences: StoredPreferences }
  | { result: 'hardAttribute' }
  | null;

/**
 * The rules row of the event, created with its defaults when missing and
 * locked: the hard attribute and the soft list are saved one at a time, so
 * a soft attribute never becomes the hard one unnoticed.
 */
async function lockedRules(
  tx: Prisma.TransactionClient,
  eventId: string,
): Promise<StoredPreferences & { nonDeterminingValues: string[] }> {
  await tx.$executeRaw`
    INSERT INTO "accommodation_rules" ("eventId", "updatedAt")
    VALUES (${eventId}::uuid, now())
    ON CONFLICT ("eventId") DO NOTHING`;
  const [row] = await tx.$queryRaw<
    {
      hardAttribute: string | null;
      nonDeterminingValues: string[] | null;
      softAttributes: string[] | null;
      softNeutralValues: unknown;
    }[]
  >`
    SELECT "hardAttribute", "nonDeterminingValues", "softAttributes", "softNeutralValues"
    FROM "accommodation_rules" WHERE "eventId" = ${eventId}::uuid
    FOR UPDATE`;
  return {
    hardAttribute: row.hardAttribute,
    nonDeterminingValues: row.nonDeterminingValues ?? [],
    softAttributes: row.softAttributes ?? [],
    softNeutralValues: readNeutralValues(row.softNeutralValues),
  };
}

const sameValues = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value) => b.includes(value));

/**
 * Pravidla ubytování of an event (spec v4 §2): its hard attribute and the
 * soft preferences of the room proposal (phase 2 §5).
 */
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
   * Chooses the hard attribute, or none. A change makes the evaluation and
   * the room proposal of every term of the event stale (and due again in
   * the automatic modes); it confirms, cancels and moves nobody. A soft
   * attribute that becomes the hard one leaves the soft list (phase 2 §2).
   * Determinations stay: switching the attribute off and on keeps them
   * valid for the same answers. Gender is the only option, so no
   * determination can belong to another attribute; the
   * categorical-questions story must handle that switch.
   */
  async saveHardAttribute(
    scope: EventScope,
    option: HardAttributeOption | null,
  ): Promise<HardAttributeSave> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: ownedEvent(scope),
        select: { id: true },
      });
      if (!event) return null;
      const rules = await lockedRules(tx, scope.eventId);
      const data = {
        hardAttribute: option?.attribute ?? null,
        nonDeterminingValues: option ? [...option.nonDeterminingValues] : [],
      };
      const isUnchanged =
        data.hardAttribute === null
          ? rules.hardAttribute === null
          : rules.hardAttribute === data.hardAttribute &&
            sameValues(rules.nonDeterminingValues, data.nonDeterminingValues);
      if (isUnchanged) return 'unchanged';
      const softNeutralValues = Object.fromEntries(
        Object.entries(rules.softNeutralValues).filter(
          ([id]) => id !== data.hardAttribute,
        ),
      );
      await tx.accommodationRules.update({
        where: { eventId: scope.eventId },
        data: {
          ...data,
          softAttributes: rules.softAttributes.filter(
            (id) => id !== data.hardAttribute,
          ),
          softNeutralValues,
        },
      });
      await termInputsChanged(tx, scope.eventId);
      await termLayoutChanged(tx, scope.eventId);
      return 'saved';
    });
  }

  /**
   * The soft preferences of the room proposal and the hard attribute they
   * cannot contain; undefined for an event outside the caller's
   * organizations. An event without rules ranks only "Přání".
   */
  async findPreferences(
    scope: EventScope,
  ): Promise<StoredPreferences | undefined> {
    const event = await this.prisma.event.findFirst({
      where: ownedEvent(scope),
      select: {
        accommodationRules: {
          select: {
            hardAttribute: true,
            softAttributes: true,
            softNeutralValues: true,
          },
        },
      },
    });
    if (!event) return undefined;
    const rules = event.accommodationRules;
    return {
      hardAttribute: rules?.hardAttribute ?? null,
      softAttributes: rules?.softAttributes ?? DEFAULT_SOFT_ATTRIBUTES,
      softNeutralValues: readNeutralValues(rules?.softNeutralValues),
    };
  }

  /**
   * Saves the ranked soft preferences and neutral answers (validated except
   * against the hard attribute, which is checked here under the lock). A
   * change makes the room proposal of every term stale, and due 10 s later
   * with automatic proposals on (phase 2 §7.1); the evaluation of
   * participation does not change.
   */
  async savePreferences(
    scope: EventScope,
    next: {
      softAttributes: readonly string[];
      softNeutralValues: SoftNeutralValues;
    },
  ): Promise<PreferencesSave> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: ownedEvent(scope),
        select: { id: true },
      });
      if (!event) return null;
      const rules = await lockedRules(tx, scope.eventId);
      if (
        rules.hardAttribute !== null &&
        next.softAttributes.includes(rules.hardAttribute)
      )
        return { result: 'hardAttribute' };
      const preferences = { hardAttribute: rules.hardAttribute, ...next };
      if (samePreferences(rules, next))
        return { result: 'unchanged', preferences };
      await tx.accommodationRules.update({
        where: { eventId: scope.eventId },
        data: {
          softAttributes: [...next.softAttributes],
          softNeutralValues: next.softNeutralValues,
        },
      });
      await termLayoutChanged(tx, scope.eventId);
      return { result: 'saved', preferences };
    });
  }
}
