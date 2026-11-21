import { PrismaService } from '@/core/prisma/prisma.service';
import { ProposalPlacements } from '@/modules/accommodation/domain/proposal-input';
import { RoommateWish } from '@/modules/accommodation/solver/room-proposal.types';
import { Injectable } from '@nestjs/common';

// Inputs of the room proposal that other stories store (spec §3): saved
// placements and locks (F14-2, #337) and roommate wishes (S4-05, #339).

/** Saved placements of the term's confirmed people, here and in other terms. */
export abstract class RoomPlacements {
  abstract placements(
    eventId: string,
    termId: string,
    registrationIds: readonly string[],
  ): Promise<ProposalPlacements>;
}

/** Wishes between the term's confirmed people; others are dropped anyway. */
export abstract class RoommateWishes {
  abstract wishes(
    eventId: string,
    termId: string,
    registrationIds: readonly string[],
  ): Promise<RoommateWish[]>;
}

/**
 * The placements of `room_placement` (spec §3 items 3 and 4): locked or not,
 * in this term and the people's other terms of the event, never another
 * term's proposal. A row of a term where the person is no longer confirmed
 * stays until the organizer clears it (F14-2) and counts nowhere.
 */
@Injectable()
export class StoredRoomPlacements extends RoomPlacements {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async placements(
    eventId: string,
    termId: string,
    registrationIds: readonly string[],
  ): Promise<ProposalPlacements> {
    const rows = await this.prisma.roomPlacement.findMany({
      where: {
        eventId,
        registrationId: { in: [...registrationIds] },
        registrationTerm: { status: 'confirmed' },
      },
      select: {
        registrationId: true,
        termId: true,
        roomId: true,
        isLocked: true,
      },
      orderBy: [{ termId: 'asc' }, { registrationId: 'asc' }],
    });
    const saved = new Map<string, { roomId: string; isLocked: boolean }>();
    const otherTerms = new Map<string, string[]>();
    for (const row of rows) {
      if (row.termId === termId) {
        saved.set(row.registrationId, {
          roomId: row.roomId,
          isLocked: row.isLocked,
        });
      } else {
        const rooms = otherTerms.get(row.registrationId) ?? [];
        if (!rooms.includes(row.roomId)) rooms.push(row.roomId);
        otherTerms.set(row.registrationId, rooms);
      }
    }
    return { saved, otherTerms };
  }
}

/**
 * The wishes of `roommate_wish` between the term's confirmed people (spec
 * §3 item 5). A wish is event-wide; it applies in a term only where both
 * people are confirmed.
 */
@Injectable()
export class StoredRoommateWishes extends RoommateWishes {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async wishes(
    eventId: string,
    _termId: string,
    registrationIds: readonly string[],
  ): Promise<RoommateWish[]> {
    const ids = [...registrationIds];
    const rows = await this.prisma.roommateWish.findMany({
      where: {
        eventId,
        fromRegistrationId: { in: ids },
        toRegistrationId: { in: ids },
      },
      select: { fromRegistrationId: true, toRegistrationId: true },
      orderBy: [{ fromRegistrationId: 'asc' }, { toRegistrationId: 'asc' }],
    });
    return rows.map((row) => ({
      from: row.fromRegistrationId,
      to: row.toRegistrationId,
    }));
  }
}
