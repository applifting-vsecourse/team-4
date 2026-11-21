import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { answerOf } from '@/modules/accommodation/domain/determination';
import {
  effectiveValue,
  HardAttribute,
} from '@/modules/accommodation/domain/effective-value';
import { ProposalSnapshot } from '@/modules/accommodation/domain/proposal-input';
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
  SavedWishState,
  savedWishState,
} from '@/modules/accommodation/domain/room-placement';
import {
  confirmedTermsOf,
  termLayoutChanged,
} from '@/modules/accommodation/repositories/term-inputs';
import { RoomProposalResult } from '@/modules/accommodation/solver/room-proposal.types';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

type Db = Prisma.TransactionClient;

/** What one change did: refused, or saved something, or found nothing to do. */
type ChangeResult =
  Exclude<PlacementOutcome, { kind: 'saved' }> | 'changed' | 'unchanged';

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

/** A usable wish of a term: both people confirmed in it (#317). */
export type TermWish = {
  from: { registrationId: string; name: string };
  to: { registrationId: string; name: string };
  /** In the saved placements now. */
  saved: SavedWishState;
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

/** What "Použít návrh" saved (spec §7.2). */
export type AppliedProposal = {
  added: number;
  moved: number;
  removed: number;
  /** The term's layout version after the apply; the proposal is now stale. */
  layoutVersion: number;
};

export type ApplyOutcome =
  | { kind: 'applied'; applied: AppliedProposal }
  | { kind: 'not_found' }
  /** The term's layout changed since the proposal, or it has no layout. */
  | { kind: 'stale' };

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

  /**
   * The wishes between the term's confirmed participants with their state in
   * the saved placements, by the names of both; null for a term outside the
   * organizer's events. Wishes of people not confirmed here don't apply.
   */
  async termWishes(
    scope: EventScope,
    termId: string,
  ): Promise<TermWish[] | null> {
    const loaded = await this.load(this.prisma, scope, termId);
    if (!loaded) return null;
    const confirmed = new Map(
      [...loaded.people].filter(([, person]) => person.isConfirmed),
    );
    const ids = [...confirmed.keys()];
    const rows = await this.prisma.roommateWish.findMany({
      where: {
        eventId: scope.eventId,
        fromRegistrationId: { in: ids },
        toRegistrationId: { in: ids },
      },
      select: { fromRegistrationId: true, toRegistrationId: true },
    });
    const hasHard = loaded.placements.hardAttribute !== null;
    const side = (id: string) => {
      const person = confirmed.get(id)!;
      return { roomId: person.current?.roomId ?? null, value: person.value };
    };
    const named = (id: string) => ({
      registrationId: id,
      name: confirmed.get(id)!.name,
    });
    return (
      rows
        .map((row) => ({
          from: named(row.fromRegistrationId),
          to: named(row.toRegistrationId),
          saved: savedWishState(
            hasHard,
            side(row.fromRegistrationId),
            side(row.toRegistrationId),
          ),
        }))
        // `byName` breaks ties by id, so it is 0 only for the same person.
        .sort((a, b) =>
          a.from.registrationId === b.from.registrationId
            ? byName(a.to, b.to)
            : byName(a.from, b.from),
        )
    );
  }

  /** Places the person into the room, or moves them there. */
  async place(
    scope: EventScope,
    termId: string,
    registrationId: string,
    input: PlaceInput,
    actorId: string,
  ): Promise<PlacementOutcome> {
    return this.change(scope, termId, registrationId, async (tx, loaded) => {
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
          if (
            input.lock === undefined ||
            input.lock === person.current?.isLocked
          ) {
            return 'unchanged';
          }
          await this.setLock(tx, termId, registrationId, input.lock);
          return 'changed';
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
          return 'changed';
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
    return this.change(scope, termId, registrationId, async (tx, loaded) => {
      const person = loaded.people.get(registrationId);
      if (!person) return { kind: 'not_found' };
      const decision = decideRemoval(person);
      if (decision === null) return 'unchanged';
      if (decision !== 'remove') return { kind: 'refused', refusal: decision };
      await tx.roomPlacement.delete({
        where: { registrationId_termId: { registrationId, termId } },
      });
      return 'changed';
    });
  }

  /** Locks or unlocks the person's placement. */
  async lock(
    scope: EventScope,
    termId: string,
    registrationId: string,
    isLocked: boolean,
  ): Promise<PlacementOutcome> {
    return this.change(scope, termId, registrationId, async (tx, loaded) => {
      const person = loaded.people.get(registrationId);
      if (!person) return { kind: 'not_found' };
      const decision = decideLock(person, isLocked);
      if (decision !== 'lock') return { kind: 'refused', refusal: decision };
      if (person.current?.isLocked === isLocked) return 'unchanged';
      await this.setLock(tx, termId, registrationId, isLocked);
      return 'changed';
    });
  }

  /**
   * "Použít návrh" (spec §7.2): saves the room of every unlocked confirmed
   * person of a current proposal, in one transaction, or nothing. Unplaced
   * unlocked people lose their saved room; locked ones stay as they are.
   * Participation, the order and publishing (#316) are untouched.
   *
   * Under the term's lock like a manual change, and the term's state row
   * `FOR UPDATE` before the version check, so no layout change can commit
   * between the check and the writes. The same key answers with the first
   * result, before the check: a repeated request saves nothing twice.
   */
  async applyProposal(
    scope: EventScope,
    termId: string,
    input: { proposalId: string; submissionKey: string },
    actorId: string,
  ): Promise<ApplyOutcome> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lockEventTerms(tx, scope, termId))) {
        return { kind: 'not_found' };
      }
      const replay = await tx.roomProposalApplication.findUnique({
        where: {
          termId_submissionKey: { termId, submissionKey: input.submissionKey },
        },
        select: {
          added: true,
          moved: true,
          removed: true,
          layoutVersion: true,
        },
      });
      if (replay) return { kind: 'applied', applied: replay };

      const proposal = await tx.accommodationRoomProposal.findFirst({
        where: { id: input.proposalId, termId, eventId: scope.eventId },
        select: {
          status: true,
          layoutVersion: true,
          input: true,
          result: true,
        },
      });
      if (!proposal) return { kind: 'not_found' };
      const version = await this.lockLayoutVersions(tx, scope.eventId, termId);
      if (proposal.status !== 'solved' || proposal.layoutVersion !== version) {
        return { kind: 'stale' };
      }
      const result = proposal.result as unknown as Extract<
        RoomProposalResult,
        { status: 'solved' }
      >;
      const snapshot = proposal.input as unknown as ProposalSnapshot;
      const loaded = (await this.load(tx, scope, termId))!;

      // Who goes where: the proposal for the unlocked, the saved room for the rest.
      const changes: { registrationId: string; roomId: string | null }[] = [];
      for (const { id } of snapshot.input.participants) {
        const person = loaded.people.get(id);
        if (!person?.isConfirmed || person.current?.isLocked) continue;
        const target = result.rooms[id] ?? null;
        if (target !== (person.current?.roomId ?? null)) {
          changes.push({ registrationId: id, roomId: target });
        }
      }
      const changed = new Map(changes.map((c) => [c.registrationId, c.roomId]));
      const valuesByRoom = new Map<string, (string | null)[]>();
      for (const person of loaded.people.values()) {
        if (!person.isConfirmed) continue;
        const roomId = changed.has(person.registrationId)
          ? changed.get(person.registrationId)!
          : (person.current?.roomId ?? null);
        if (roomId === null) continue;
        valuesByRoom.set(roomId, [
          ...(valuesByRoom.get(roomId) ?? []),
          person.value,
        ]);
      }

      const counts = { added: 0, moved: 0, removed: 0 };
      const placedAt = new Date();
      for (const { registrationId, roomId } of changes) {
        const current = loaded.people.get(registrationId)!.current;
        if (roomId === null) {
          counts.removed += 1;
          await tx.roomPlacement.delete({
            where: { registrationId_termId: { registrationId, termId } },
          });
          continue;
        }
        counts[current ? 'moved' : 'added'] += 1;
        // The organizer accepts the proposal's rooms as they are, extra beds
        // included: those are the exceptions confirmed by applying it.
        const data = {
          roomId,
          isLocked: false,
          confirmedWarnings: roomWarnings(
            loaded.beds.get(roomId) ?? NO_BEDS,
            valuesByRoom.get(roomId) ?? [],
          ).filter(isConfirmable),
          placedById: actorId,
          placedAt,
        };
        await tx.roomPlacement.upsert({
          where: { registrationId_termId: { registrationId, termId } },
          create: { registrationId, termId, eventId: scope.eventId, ...data },
          update: data,
        });
      }

      // Applying moves the version on even when nothing changed (§7.1), and
      // in the other terms of everyone whose room changed.
      const others = await tx.registrationTerm.findMany({
        where: {
          registrationId: { in: changes.map((c) => c.registrationId) },
          status: 'confirmed',
        },
        select: { termId: true },
        distinct: ['termId'],
      });
      await termLayoutChanged(tx, scope.eventId, [
        ...new Set([termId, ...others.map((row) => row.termId)]),
      ]);
      const after = await tx.accommodationTermState.findUniqueOrThrow({
        where: { termId },
        select: { layoutVersion: true },
      });
      const applied = { ...counts, layoutVersion: after.layoutVersion };
      await tx.roomProposalApplication.create({
        data: {
          eventId: scope.eventId,
          termId,
          proposalId: input.proposalId,
          submissionKey: input.submissionKey,
          actorId,
          ...applied,
        },
      });
      return { kind: 'applied', applied };
    });
  }

  /**
   * Runs one change of the term's placements and answers with the term as it
   * is after it. The term is locked `NO KEY UPDATE` first, so changes of one
   * term run one after another and a room's count is never checked against a
   * stale one; the `KEY SHARE` of other writers (`termInputsChanged`) and the
   * placements' own foreign keys still go through. The event's other terms
   * are key-share locked in the same pass (`lockEventTerms`), so a writer
   * holding terms `FOR UPDATE` (a room change, a registration) waits for it,
   * or it for that writer, never both.
   *
   * A saved change makes the room proposals of the term stale, and of the
   * person's other confirmed terms, whose proposals keep them in the same
   * room (spec §7.1).
   */
  private async change(
    scope: EventScope,
    termId: string,
    registrationId: string,
    work: (tx: Db, loaded: Loaded) => Promise<ChangeResult>,
  ): Promise<PlacementOutcome> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lockEventTerms(tx, scope, termId))) {
        return { kind: 'not_found' };
      }
      const loaded = await this.load(tx, scope, termId);
      if (!loaded) return { kind: 'not_found' };
      const result = await work(tx, loaded);
      if (typeof result === 'object') return result;
      if (result === 'changed') {
        const terms = await confirmedTermsOf(tx, registrationId);
        await termLayoutChanged(tx, scope.eventId, [
          ...new Set([termId, ...terms]),
        ]);
      }
      const after = await this.load(tx, scope, termId);
      return { kind: 'saved', placements: after!.placements };
    });
  }

  /**
   * Locks the state rows of every term of the event, creating the missing
   * ones (a missing row is version 0), in one statement in term id order, as
   * `termLayoutChanged` takes them. No layout change of the event commits
   * until the caller does. Returns the layout version of `termId`. Call it
   * after `lockEventTerms`.
   */
  private async lockLayoutVersions(
    tx: Db,
    eventId: string,
    termId: string,
  ): Promise<number> {
    const states = await tx.$queryRaw<
      { termId: string; layoutVersion: number }[]
    >`
      INSERT INTO "accommodation_term_state" ("termId", "eventId")
      SELECT "id", "eventId" FROM "event_term"
      WHERE "eventId" = ${eventId}::uuid
      ORDER BY "id"
      ON CONFLICT ("termId") DO UPDATE
        SET "layoutVersion" = "accommodation_term_state"."layoutVersion"
      RETURNING "termId", "layoutVersion"`;
    return states.find((state) => state.termId === termId)?.layoutVersion ?? 0;
  }

  /**
   * Locks the organizer's term `NO KEY UPDATE` and the event's other terms
   * `KEY SHARE`, one row at a time in term id order, the order of every
   * writer that locks terms (`FOR UPDATE` of rooms and registrations, the
   * `KEY SHARE` of `termLayoutChanged`). False for a term outside the
   * organizer's events; nothing is locked then.
   */
  private async lockEventTerms(
    tx: Db,
    scope: EventScope,
    termId: string,
  ): Promise<boolean> {
    const owned = await tx.$queryRaw<{ id: string }[]>`
      SELECT t."id" FROM "event_term" t
      JOIN "event" e ON e."id" = t."eventId"
      JOIN "organization" o ON o."id" = e."organizationId"
      WHERE e."id" = ${scope.eventId}::uuid
        AND e."organizationId" = ${scope.organizationId}::uuid
        AND o."ownerId" = ${scope.ownerId}
      ORDER BY t."id"`;
    if (!owned.some((term) => term.id === termId)) return false;
    for (const { id } of owned) {
      if (id === termId) {
        await tx.$queryRaw`
          SELECT "id" FROM "event_term" WHERE "id" = ${id}::uuid
          FOR NO KEY UPDATE`;
      } else {
        await tx.$queryRaw`
          SELECT "id" FROM "event_term" WHERE "id" = ${id}::uuid
          FOR KEY SHARE`;
      }
    }
    return true;
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
