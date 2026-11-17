import { ProposalPlacements } from '@/modules/accommodation/domain/proposal-input';
import { RoommateWish } from '@/modules/accommodation/solver/room-proposal.types';
import { Injectable } from '@nestjs/common';

// Inputs of the room proposal that other stories store (spec §3): saved
// placements and locks (F14-2, #337) and roommate wishes (#319, #339).
// Until they do, the proposal sees none, so it lays out everyone afresh.

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

/** No placements are stored yet (#337). */
@Injectable()
export class NoRoomPlacements extends RoomPlacements {
  placements(): Promise<ProposalPlacements> {
    return Promise.resolve({ saved: new Map(), otherTerms: new Map() });
  }
}

/** No wishes are stored yet (#339). */
@Injectable()
export class NoRoommateWishes extends RoommateWishes {
  wishes(): Promise<RoommateWish[]> {
    return Promise.resolve([]);
  }
}
