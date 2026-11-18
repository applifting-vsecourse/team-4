/** What a profile stores; `null` is a value the participant did not fill in. */
export type ParticipantProfileValues = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null; // E.164
};

/**
 * The optional personal details of a verified participant account (S4-08).
 * They only prefill a new registration: a registration never changes them,
 * and the e-mail is the account's sign-in address, which is not edited here.
 */
export class ParticipantProfile {
  constructor(
    public readonly email: string,
    public readonly values: ParticipantProfileValues,
  ) {}
}
