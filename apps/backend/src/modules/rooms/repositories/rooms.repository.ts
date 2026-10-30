import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  RoomInput,
  RoomModel,
  RoomsOverviewModel,
  RoomTermSetting,
  TermCapacity,
  termCapacity,
  termOccupancy,
} from '@/modules/rooms/domain/room';
import { Injectable } from '@nestjs/common';

/** A term with what holds its beds, shared by every capacity write (§3.6). */
export const termsWithBeds = {
  orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
  select: {
    id: true,
    label: true,
    startDate: true,
    endDate: true,
    roomAvailabilities: {
      select: { isAvailable: true, baseBeds: true, extraBeds: true },
    },
    _count: {
      select: { registrationTerms: { where: { status: 'confirmed' } } },
    },
  },
} satisfies Prisma.Event$termsArgs;

export type TermWithBeds = Prisma.EventTermGetPayload<typeof termsWithBeds>;

export const toTermCapacity = (term: TermWithBeds): TermCapacity =>
  termCapacity(
    {
      id: term.id,
      label: term.label,
      startDate: fromDate(term.startDate),
      endDate: fromDate(term.endDate),
    },
    term.roomAvailabilities,
    term._count.registrationTerms,
  );

/** True for a violated unique index, e.g. a second "pokoj 1" in one event. */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

/**
 * Room writes of one event inside a transaction that holds every term row of
 * the event, in id order, which is the serialization point shared with the
 * confirmation of participants (data-model.md §3.6).
 */
export class LockedRooms {
  constructor(
    private readonly tx: Prisma.TransactionClient,
    public readonly eventId: string,
  ) {}

  async termCapacities(): Promise<TermCapacity[]> {
    const terms = await this.tx.eventTerm.findMany({
      where: { eventId: this.eventId },
      ...termsWithBeds,
    });
    return terms.map(toTermCapacity);
  }

  async insertRoom(input: RoomInput): Promise<void> {
    const room = await this.tx.room.create({
      data: { eventId: this.eventId, label: input.label },
      select: { id: true },
    });
    await this.setAvailability(room.id, input.terms);
  }

  /** False when the room does not belong to this event. */
  async updateRoom(roomId: string, input: RoomInput): Promise<boolean> {
    const { count } = await this.tx.room.updateMany({
      where: { id: roomId, eventId: this.eventId },
      data: { label: input.label },
    });
    if (count !== 1) return false;
    await this.tx.roomTermAvailability.deleteMany({ where: { roomId } });
    await this.setAvailability(roomId, input.terms);
    return true;
  }

  /** False when the room does not belong to this event. */
  async deleteRoom(roomId: string): Promise<boolean> {
    const { count } = await this.tx.room.deleteMany({
      where: { id: roomId, eventId: this.eventId },
    });
    return count === 1;
  }

  // Not a nested write: Prisma cannot fill the composite (roomId, eventId) key.
  private async setAvailability(
    roomId: string,
    terms: RoomTermSetting[],
  ): Promise<void> {
    await this.tx.roomTermAvailability.createMany({
      data: terms.map((term) => ({
        roomId,
        eventId: this.eventId,
        ...term,
      })),
    });
  }
}

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when the event is not in an organization of the caller (S2-03). */
  async findOverview(scope: EventScope): Promise<RoomsOverviewModel | null> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: scope.eventId,
        organizationId: scope.organizationId,
        organization: { ownerId: scope.ownerId },
      },
      select: {
        terms: {
          ...termsWithBeds,
          select: {
            ...termsWithBeds.select,
            // `_count` takes one filter per relation; confirmed is in the shared one.
            registrationTerms: {
              where: { status: 'waitlisted' },
              select: { registrationId: true },
            },
          },
        },
        rooms: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            label: true,
            availabilities: {
              select: {
                termId: true,
                isAvailable: true,
                baseBeds: true,
                extraBeds: true,
              },
              orderBy: { termId: 'asc' },
            },
          },
        },
      },
    });
    if (!event) return null;
    return new RoomsOverviewModel(
      event.rooms.map(
        (room) => new RoomModel(room.id, room.label, room.availabilities),
      ),
      event.terms.map((term) =>
        termOccupancy(toTermCapacity(term), term.registrationTerms.length),
      ),
    );
  }

  /**
   * `{ found: false }` when the event is not in the caller's organization. The
   * event row is only shared-locked: a term cannot be added or removed meanwhile
   * (those take it exclusively), while confirmations, which lock terms only, go on.
   */
  async withLockedRooms<T>(
    scope: EventScope,
    work: (rooms: LockedRooms) => Promise<T>,
  ): Promise<{ found: true; result: T } | { found: false }> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT e."id"
        FROM "event" e
        JOIN "organization" o ON o."id" = e."organizationId"
        WHERE e."id" = ${scope.eventId}::uuid
          AND e."organizationId" = ${scope.organizationId}::uuid
          AND o."ownerId" = ${scope.ownerId}
        FOR SHARE OF e`;
      if (rows.length === 0) return { found: false };
      await tx.$queryRaw`
        SELECT "id" FROM "event_term"
        WHERE "eventId" = ${scope.eventId}::uuid
        ORDER BY "id" FOR UPDATE`;
      const result = await work(new LockedRooms(tx, scope.eventId));
      return { found: true, result };
    });
  }
}
