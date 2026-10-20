import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  RoomInput,
  RoomModel,
  RoomsOverviewModel,
  TermCapacity,
  termCapacity,
} from '@/modules/rooms/domain/room';
import { Injectable } from '@nestjs/common';

const termsWithBeds = {
  orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
  select: {
    id: true,
    label: true,
    startDate: true,
    endDate: true,
    roomAvailabilities: { select: { room: { select: { bedCount: true } } } },
    _count: {
      select: { registrationTerms: { where: { status: 'confirmed' } } },
    },
  },
} satisfies Prisma.Event$termsArgs;

type TermWithBeds = Prisma.EventTermGetPayload<typeof termsWithBeds>;

const toTermCapacity = (term: TermWithBeds): TermCapacity =>
  termCapacity(
    {
      id: term.id,
      label: term.label,
      startDate: fromDate(term.startDate),
      endDate: fromDate(term.endDate),
    },
    term.roomAvailabilities.map((availability) => availability.room.bedCount),
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
      data: {
        eventId: this.eventId,
        label: input.label,
        bedCount: input.bedCount,
      },
      select: { id: true },
    });
    await this.setAvailability(room.id, input.termIds);
  }

  /** False when the room does not belong to this event. */
  async updateRoom(roomId: string, input: RoomInput): Promise<boolean> {
    const { count } = await this.tx.room.updateMany({
      where: { id: roomId, eventId: this.eventId },
      data: { label: input.label, bedCount: input.bedCount },
    });
    if (count !== 1) return false;
    await this.tx.roomTermAvailability.deleteMany({ where: { roomId } });
    await this.setAvailability(roomId, input.termIds);
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
    termIds: string[],
  ): Promise<void> {
    await this.tx.roomTermAvailability.createMany({
      data: termIds.map((termId) => ({
        roomId,
        termId,
        eventId: this.eventId,
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
        terms: termsWithBeds,
        rooms: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            label: true,
            bedCount: true,
            availabilities: { select: { termId: true } },
          },
        },
      },
    });
    if (!event) return null;
    return new RoomsOverviewModel(
      event.rooms.map(
        (room) =>
          new RoomModel(
            room.id,
            room.label,
            room.bedCount,
            room.availabilities.map((availability) => availability.termId),
          ),
      ),
      event.terms.map(toTermCapacity),
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
