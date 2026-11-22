import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  EventAttribute,
  eventAttributes,
  questionAttributesSelect,
} from '@/modules/accommodation/domain/attributes';
import {
  DEFAULT_SOFT_ATTRIBUTES,
  invalidPreferences,
  readNeutralValues,
  samePreferences,
  SoftNeutralValues,
  storedPreferences,
} from '@/modules/accommodation/domain/room-proposal-preferences';
import { ownedEvent } from '@/modules/accommodation/repositories/term-evaluation.repository';
import {
  termInputsChanged,
  termLayoutChanged,
} from '@/modules/accommodation/repositories/term-inputs';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

/**
 * What saving the hard attribute did: `invalid` for an attribute that is no
 * question of the event, or answers that are not its answers; null for an
 * event the caller cannot manage.
 */
export type HardAttributeSave = 'saved' | 'unchanged' | 'invalid' | null;

/** The chosen hard attribute and the questions it can be chosen from (#384, #485). */
export type StoredHardAttribute = {
  hardAttribute: string | null;
  /** Its answers that decide no room; empty without a hard attribute. */
  nonDeterminingValues: string[];
  attributes: EventAttribute[];
};

/** A choice of the hard attribute; without `nonDeterminingValues`, the attribute's defaults. */
export type HardAttributeChoice = {
  attribute: string;
  nonDeterminingValues?: readonly string[];
};

/** The soft preferences of the room proposal as stored (#389). */
export type StoredPreferences = {
  hardAttribute: string | null;
  softAttributes: readonly string[];
  softNeutralValues: SoftNeutralValues;
  /** Every categorical question of the event (#485). */
  attributes: EventAttribute[];
};

/**
 * What saving the soft preferences did: `hardAttribute` when the list
 * contains the event's hard attribute; null for an event the caller cannot
 * manage.
 */
export type PreferencesSave =
  | { result: 'saved' | 'unchanged'; preferences: StoredPreferences }
  | { result: 'hardAttribute' }
  | { result: 'invalid'; message: string }
  | null;

/**
 * The rules row of the event, created with its defaults when missing and
 * locked: the hard attribute and the soft list are saved one at a time, so
 * a soft attribute never becomes the hard one unnoticed.
 */
export async function lockedRules(
  tx: Prisma.TransactionClient,
  eventId: string,
): Promise<
  Omit<StoredPreferences, 'attributes'> & { nonDeterminingValues: string[] }
> {
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

/** The event's questions as attributes, read in the caller's transaction. */
const attributesIn = async (
  db: Prisma.TransactionClient,
  eventId: string,
): Promise<EventAttribute[]> =>
  eventAttributes(
    await db.registrationQuestion.findMany({
      where: { eventId },
      ...questionAttributesSelect,
    }),
  );

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
   * The chosen hard attribute (null when rooms are not split by one) and the
   * questions to choose from; undefined for an event outside the caller's
   * organizations.
   */
  async findHardAttribute(
    scope: EventScope,
  ): Promise<StoredHardAttribute | undefined> {
    const event = await this.prisma.event.findFirst({
      where: ownedEvent(scope),
      select: {
        accommodationRules: {
          select: { hardAttribute: true, nonDeterminingValues: true },
        },
        questions: questionAttributesSelect,
      },
    });
    if (!event) return undefined;
    const hardAttribute = event.accommodationRules?.hardAttribute ?? null;
    return {
      hardAttribute,
      nonDeterminingValues: hardAttribute
        ? (event.accommodationRules?.nonDeterminingValues ?? [])
        : [],
      attributes: eventAttributes(event.questions),
    };
  }

  /**
   * Chooses the hard attribute, or none. A change makes the evaluation and
   * the room proposal of every term of the event stale (and due again in
   * the automatic modes); it confirms, cancels and moves nobody. A soft
   * attribute that becomes the hard one leaves the soft list (phase 2 §2).
   * A participant has one determination, for the attribute it was made for
   * (#485): it counts only while that attribute is the hard one, and a new
   * determination under another attribute replaces it. The question is checked under the rules lock, which the
   * questions' own save takes too, so it cannot be removed meanwhile.
   */
  async saveHardAttribute(
    scope: EventScope,
    choice: HardAttributeChoice | null,
  ): Promise<HardAttributeSave> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: ownedEvent(scope),
        select: { id: true },
      });
      if (!event) return null;
      const rules = await lockedRules(tx, scope.eventId);
      const option = choice
        ? (await attributesIn(tx, scope.eventId)).find(
            (o) => o.attribute === choice.attribute,
          )
        : null;
      if (choice && !option) return 'invalid';
      const nonDetermining = choice?.nonDeterminingValues ?? [
        ...(option?.defaultNonDetermining ?? []),
      ];
      const values = option?.values.map((value) => value.value) ?? [];
      if (
        new Set(nonDetermining).size !== nonDetermining.length ||
        nonDetermining.some((value) => !values.includes(value))
      )
        return 'invalid';
      const data = {
        hardAttribute: option?.attribute ?? null,
        nonDeterminingValues: [...nonDetermining],
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
        questions: questionAttributesSelect,
      },
    });
    if (!event) return undefined;
    const rules = event.accommodationRules;
    return {
      hardAttribute: rules?.hardAttribute ?? null,
      softAttributes: rules?.softAttributes ?? DEFAULT_SOFT_ATTRIBUTES,
      softNeutralValues: readNeutralValues(rules?.softNeutralValues),
      attributes: eventAttributes(event.questions),
    };
  }

  /**
   * Saves the ranked soft preferences and neutral answers, checked against
   * the event's questions and hard attribute under the rules lock. A
   * change makes the room proposal of every term stale, and due 10 s later
   * with automatic proposals on (phase 2 §7.1); the evaluation of
   * participation does not change.
   */
  async savePreferences(
    scope: EventScope,
    items: readonly { id: string; neutralValues?: readonly string[] }[],
  ): Promise<PreferencesSave> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: ownedEvent(scope),
        select: { id: true },
      });
      if (!event) return null;
      const rules = await lockedRules(tx, scope.eventId);
      const attributes = await attributesIn(tx, scope.eventId);
      const invalid = invalidPreferences(items, attributes);
      if (invalid) return { result: 'invalid', message: invalid };
      const next = storedPreferences(items);
      if (
        rules.hardAttribute !== null &&
        next.softAttributes.includes(rules.hardAttribute)
      )
        return { result: 'hardAttribute' };
      const preferences = {
        hardAttribute: rules.hardAttribute,
        ...next,
        attributes,
      };
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
