import { participantWishState } from '@/modules/accommodation/domain/participant-placements';

describe('the state of an own wish shown to the participant', () => {
  it('is satisfied in the same room', () => {
    expect(participantWishState('a', 'a')).toBe('satisfied');
  });

  it('is unsatisfied in different rooms', () => {
    expect(participantWishState('a', 'b')).toBe('unsatisfied');
  });

  it('waits for a room while either person has none', () => {
    expect(participantWishState(null, 'a')).toBe('unplaced');
    expect(participantWishState('a', null)).toBe('unplaced');
    expect(participantWishState(null, null)).toBe('unplaced');
  });
});
