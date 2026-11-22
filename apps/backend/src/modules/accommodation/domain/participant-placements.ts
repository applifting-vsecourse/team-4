/**
 * The state of an own roommate wish as the participant sees it (S4-02, #316):
 * the three states of #317 decided by the rooms alone. The organizer's
 * "impossible" reason would reveal the other person's hard attribute value,
 * so a participant never gets it.
 */
export type ParticipantWishState = 'satisfied' | 'unsatisfied' | 'unplaced';

export function participantWishState(
  fromRoomId: string | null,
  toRoomId: string | null,
): ParticipantWishState {
  if (fromRoomId === null || toRoomId === null) return 'unplaced';
  return fromRoomId === toRoomId ? 'satisfied' : 'unsatisfied';
}

/** One confirmed term of the participant's own registration. */
export type ParticipantTermPlacement = {
  termId: string;
  label: string;
  startDate: Date;
  endDate: Date;
} & (
  | { isPublished: false }
  | {
      isPublished: true;
      /** The own room; null while the participant has none. */
      room: { label: string } | null;
      /** Own wishes for someone confirmed in this term too, by name. */
      wishes: {
        registrationId: string;
        name: string;
        state: ParticipantWishState;
      }[];
    }
);
