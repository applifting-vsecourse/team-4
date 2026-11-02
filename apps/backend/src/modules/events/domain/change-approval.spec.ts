import { requiresApproval } from '@/modules/events/domain/change-approval';

// 2027-07-01 12:00 in Prague.
const NOW = new Date('2027-07-01T10:00:00Z');

describe('requiresApproval', () => {
  it('never requires approval without a setting', () => {
    expect(requiresApproval(null, [{ startDate: '2027-07-01' }], NOW)).toBe(
      false,
    );
  });

  it('applies from the boundary day on, not before', () => {
    const term = [{ startDate: '2027-07-15' }];
    expect(requiresApproval(14, term, NOW)).toBe(true);
    expect(requiresApproval(13, term, NOW)).toBe(false);
  });

  it('treats 0 as approval from the start day', () => {
    expect(requiresApproval(0, [{ startDate: '2027-07-02' }], NOW)).toBe(false);
    expect(requiresApproval(0, [{ startDate: '2027-07-01' }], NOW)).toBe(true);
    expect(requiresApproval(0, [{ startDate: '2027-06-20' }], NOW)).toBe(true);
  });

  it('needs only one affected term to reach the boundary', () => {
    expect(
      requiresApproval(
        7,
        [{ startDate: '2027-09-01' }, { startDate: '2027-07-05' }],
        NOW,
      ),
    ).toBe(true);
  });

  it('uses the Prague calendar day around midnight', () => {
    // 22:30 UTC on 30 June is already 1 July, 00:30 in Prague.
    const lateNow = new Date('2027-06-30T22:30:00Z');
    expect(requiresApproval(0, [{ startDate: '2027-07-01' }], lateNow)).toBe(
      true,
    );
  });
});
