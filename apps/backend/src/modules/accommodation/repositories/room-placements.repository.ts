import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { answerOf } from '@/modules/accommodation/domain/determination';
import {
  effectiveValue,
  HardAttribute,
} from '@/modules/accommodation/domain/effective-value';
import {
  byName,
  ConfirmableWarning,
  decideLock,
  decidePlacement,
  decideRemoval,
  fullName,
  NO_BEDS,
  PlacedPerson,
  PlacementRefusal,
  PlacementWarning,
  RoomBeds,
  roomWarnings,
} from '@/modules/accommodation/domain/room-placement';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

type Db = Prisma.TransactionClient;

/** A confirmed participant of the term. */
export type PlacementPerson = {
  registrationId: string;
  name: string;
  /** The effective value of the hard attribute; null without one. */
  value: string | null;
};

export type Occupant = PlacementPerson & {
  isLocked: boolean;
  /** The warnings the organizer confirmed when placing them. */
  confirmedWarnings: ConfirmableWarning[];
};

export type PlacementRoom = RoomBeds & {
  roomId: string;
  label: string;
  /** By name. */
  occupants: Occupant[];
  warnings: PlacementWarning[];
};

/** The rooms of a term with their people, and who has none (F14-2). */
export type TermPlacements = {
  /** The event's hard attribute; null when rooms are not split by one. */
  hardAttribute: string | null;
  /** Every room of the event, by label; one without settings in the term is unavailable. */
  rooms: PlacementRoom[];
  /** Confirmed participants of the term without a room, by name. */
  unplaced: PlacementPerson[];
};

export type PlacementOutcome =
  | { kind: 'saved'; placements: TermPlacements }
  | { kind: 'not_found' }
  | { kind: 'refused'; refusal: PlacementRefusal }
  | { kind: 'needs_confirmation'; warnings: ConfirmableWarning[] };

export type PlaceInput = {
  roomId: string;
  /** The warnings the organizer confirms; saved only if they cover the room's. */
  confirmWarnings: ConfirmableWarning[];
  /** Lock the placement as it is saved; unset keeps the current lock. */
  lock?: boolean;
};

/** The term's state as one change reads it, under the term's lock. */
type Loaded = {
  placements: TermPlacements;
  /** Each registration of the term, with its status and placement. */
  people: Map<string, PlacedPerson & PlacementPerson>;
  beds: Map<string, RoomBeds>;
};

const hardAttributeOf = (
  rules: {
    hardAttribute: string | null;
    nonDeterminingValues: string[];
  } | null,
): HardAttribute | null =>
  rules?.hardAttribute
    ? {
        attribute: rules.hardAttribute,
        nonDeterminingValues: rules.nonDeterminingValues,
      }
    : null;

const isConfirmable = (value: string): value is ConfirmableWarning =>
  value === 'mixed' || value === 'extra_bed' || value === 'over_capacity';

/** Room placements of the terms of an event (F14-2, #337). */
@Injectable()
export class RoomPlacementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null for a term outside the organizer's events. */
  async find(
    scope: EventScope,
    termId: string,
  ): Promise<TermPlacements | null> {
    return (await this.load(this.prisma, scope, termId))?.placements ?? null;
  }

  /** Places the person into the room, or moves them there. */
  async place(
    scope: EventScope,
    termId: string,
    registrationId: string,
    input: PlaceInput,
    actorId: string,
  ): Promise<PlacementOutcome> {
    return this.change(scope, termId, async (tx, loaded) => {
      const person = loaded.people.get(registrationId);
      const beds = loaded.beds.get(input.roomId);
      if (!person || !beds) return { kind: 'not_found' };
      const valuesAfter = [
        ...(loaded.placements.rooms
          .find((room) => room.roomId === input.roomId)
          ?.occupants.map((o) => o.value) ?? []),
        person.value,
      ];
      const decision = decidePlacement(
        person,
        input.roomId,
        beds,
        valuesAfter,
        input.confirmWarnings,
      );
      switch (decision.kind) {
        case 'refused':
          return { kind: 'refused', refusal: decision.refusal };
        case 'needs_confirmation':
          return decision;
        case 'unchanged':
          if (input.lock !== undefined) {
            await this.setLock(tx, termId, registrationId, input.lock);
          }
          return null;
        case 'place': {
          // A move of a locked placement is refused above, so `lock` unset
          // here means a new or unlocked placement: it stays unlocked.
          const data = {
            roomId: input.roomId,
            confirmedWarnings: decision.confirmedWarnings,
            placedById: actorId,
            placedAt: new Date(),
            isLocked: input.lock ?? false,
          };
          await tx.roomPlacement.upsert({
            where: { registrationId_termId: { registrationId, termId } },
            create: { registrationId, termId, eventId: scope.eventId, ...data },
            update: data,
          });
          return null;
        }
      }
    });
  }

  /** Takes the person out of their room; nothing when they have none. */
  async remove(
    scope: EventScope,
    termId: string,
    registrationId: string,
  ): Promise<PlacementOutcome> {
    return this.change(scope, termId, async (tx, loaded) => {
      const person = loaded.people.get(registrationId);
      if (!person) return { kind: 'not_found' };
      const decision = decideRemoval(person);
      if (decision === null) return null;
      if (decision !== 'remove') return { kind: 'refused', refusal: decision };
      await tx.roomPlacement.delete({
        where: { registrationId_termId: { registrationId, termId } },
      });
      return null;
    });
  }

  /** Locks or unlocks the person's placement. */
  async lock(
    scope: EventScope,
    termId: string,
    registrationId: string,
    isLocked: boolean,
  ): Promise<PlacementOutcome> {
    return this.change(scope, termId, async (tx, loaded) => {
      const person = loaded.people.get(registrationId);
      if (!person) return { kind: 'not_found' };
      const decision = decideLock(person, isLocked);
      if (decision !== 'lock') return { kind: 'refused', refusal: decision };
      await this.setLock(tx, termId, registrationId, isLocked);
      return null;
    });
  }

  /**
   * Runs one change of the term's placements and answers with the term as it
   * is after it. The term is locked `NO KEY UPDATE` first, so changes of one
   * term run one after another and a room's count is never checked against a
   * stale one; the `KEY SHARE` of other writers (`termInputsChanged`) and the
   * placements' own foreign keys still go through. A room change, which holds
   * the terms `FOR UPDATE`, waits for it, or it for the room change.
   */
  private async change(
    scope: EventScope,
    termId: string,
    work: (
      tx: Db,
      loaded: Loaded,
    ) => Promise<Exclude<PlacementOutcome, { kind: 'saved' }> | null>,
  ): Promise<PlacementOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const term = await tx.$queryRaw<{ id: string }[]>`
        SELECT t."id" FROM "event_term" t
        JOIN "event" e ON e."id" = t."eventId"
        JOIN "organization" o ON o."id" = e."organizationId"
        WHERE t."id" = ${termId}::uuid
          AND e."id" = ${scope.eventId}::uuid
          AND e."organizationId" = ${scope.organizationId}::uuid
          AND o."ownerId" = ${scope.ownerId}
        FOR NO KEY UPDATE OF t`;
      if (term.length === 0) return { kind: 'not_found' };
      const loaded = await this.load(tx, scope, termId);
      if (!loaded) return { kind: 'not_found' };
      const refused = await work(tx, loaded);
      if (refused) return refused;
      const after = await this.load(tx, scope, termId);
      return { kind: 'saved', placements: after!.placements };
    });
  }

  private async setLock(
    tx: Db,
    termId: string,
    registrationId: string,
    isLocked: boolean,
  ): Promise<void> {
    await tx.roomPlacement.update({
      where: { registrationId_termId: { registrationId, termId } },
      data: { isLocked },
    });
  }

  private async load(
    db: Db,
    scope: EventScope,
    termId: string,
  ): Promise<Loaded | null> {
    const term = await db.eventTerm.findFirst({
      where: {
        id: termId,
        eventId: scope.eventId,
        event: {
          organizationId: scope.organizationId,
          organization: { ownerId: scope.ownerId },
        },
      },
      select: {
        event: {
          select: {
            accommodationRules: {
              select: { hardAttribute: true, nonDeterminingValues: true },
            },
            rooms: {
              select: {
                id: true,
                label: true,
                availabilities: {
                  where: { termId },
                  select: {
                    isAvailable: true,
                    baseBeds: true,
                    extraBeds: true,
                  },
                },
              },
            },
          },
        },
        registrationTerms: {
          select: {
            status: true,
            registration: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                accommodationManualValue: {
                  select: { value: true, basedOnAnswer: true },
                },
              },
            },
            placement: {
              select: { roomId: true, isLocked: true, confirmedWarnings: true },
            },
          },
        },
      },
    });
    if (!term) return null;
    const hard = hardAttributeOf(term.event.accommodationRules);

    const beds = new Map<string, RoomBeds>(
      term.event.rooms.map((room) => [
        room.id,
        room.availabilities[0] ?? NO_BEDS,
      ]),
    );
    const people = new Map<string, PlacedPerson & PlacementPerson>();
    const occupants = new Map<string, Occupant[]>();
    const unplaced: PlacementPerson[] = [];
    for (const { status, registration, placement } of term.registrationTerms) {
      const person: PlacementPerson = {
        registrationId: registration.id,
        name: fullName(registration),
        value: effectiveValue(
          hard,
          hard ? answerOf(hard.attribute, registration) : null,
          registration.accommodationManualValue,
        ),
      };
      const isConfirmed = status === 'confirmed';
      people.set(registration.id, {
        ...person,
        isConfirmed,
        current: placement && {
          roomId: placement.roomId,
          isLocked: placement.isLocked,
        },
      });
      // Someone no longer confirmed keeps the row but is shown nowhere.
      if (!isConfirmed) continue;
      if (!placement) {
        unplaced.push(person);
        continue;
      }
      const list = occupants.get(placement.roomId) ?? [];
      list.push({
        ...person,
        isLocked: placement.isLocked,
        confirmedWarnings: placement.confirmedWarnings.filter(isConfirmable),
      });
      occupants.set(placement.roomId, list);
    }

    const rooms = term.event.rooms
      .map((room): PlacementRoom => {
        const roomBeds = beds.get(room.id)!;
        const inRoom = (occupants.get(room.id) ?? []).sort(byName);
        return {
          roomId: room.id,
          label: room.label,
          ...roomBeds,
          occupants: inRoom,
          warnings: roomWarnings(
            roomBeds,
            inRoom.map((o) => o.value),
          ),
        };
      })
      .sort(
        (a, b) =>
          a.label.localeCompare(b.label, 'cs') ||
          (a.roomId < b.roomId ? -1 : 1),
      );
    return {
      placements: {
        hardAttribute: hard?.attribute ?? null,
        rooms,
        unplaced: unplaced.sort(byName),
      },
      people,
      beds,
    };
  }
}
